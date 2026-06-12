import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { elders } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { processDocument } from '@/lib/pipeline'
import { sendExceptionAlert } from '@/lib/email'
import {
  DEFAULT_INBOUND_MAX_ATTACHMENTS,
  DEFAULT_INBOUND_MAX_ATTACHMENT_BYTES,
  type DecodedAttachment,
  decodeAttachment,
  decodeAttachmentBuffer,
  findInboundAddress,
  getProvidedWebhookSecret,
  verifyMailgunSignature,
  verifyWebhookSecret,
  type InboundAttachment,
} from '@/lib/inbound-email'

export const runtime = 'nodejs'

interface ParsedInboundEmail {
  to: unknown
  attachments: DecodedAttachment[]
}

function getMaxAttachmentBytes() {
  return Number(process.env.INBOUND_EMAIL_MAX_ATTACHMENT_BYTES ?? DEFAULT_INBOUND_MAX_ATTACHMENT_BYTES)
}

async function parseJsonInboundEmail(req: NextRequest): Promise<ParsedInboundEmail | NextResponse> {
  const expectedSecret = process.env.INBOUND_EMAIL_WEBHOOK_SECRET
  const providedSecret = getProvidedWebhookSecret(req.headers)
  if (!verifyWebhookSecret(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const rawAttachments = body.attachments ?? body.Attachments
  const attachments: InboundAttachment[] = Array.isArray(rawAttachments)
    ? rawAttachments.slice(0, DEFAULT_INBOUND_MAX_ATTACHMENTS)
    : []
  const maxBytes = getMaxAttachmentBytes()

  return {
    to: body.to ?? body.To ?? body.recipients ?? body.Recipients,
    attachments: attachments
      .map((attachment) => decodeAttachment(attachment, { maxBytes }))
      .filter((attachment): attachment is DecodedAttachment => attachment != null),
  }
}

async function parseMailgunInboundEmail(req: NextRequest): Promise<ParsedInboundEmail | NextResponse> {
  const formData = await req.formData()
  const timestamp = formData.get('timestamp')
  const token = formData.get('token')
  const signature = formData.get('signature')

  if (!verifyMailgunSignature({
    signingKey: process.env.MAILGUN_WEBHOOK_SIGNING_KEY,
    timestamp: typeof timestamp === 'string' ? timestamp : null,
    token: typeof token === 'string' ? token : null,
    signature: typeof signature === 'string' ? signature : null,
  })) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const maxBytes = getMaxAttachmentBytes()
  const attachmentCount = Math.min(
    Number(formData.get('attachment-count') ?? 0) || 0,
    DEFAULT_INBOUND_MAX_ATTACHMENTS,
  )
  const attachments: DecodedAttachment[] = []

  for (let i = 1; i <= attachmentCount; i += 1) {
    const file = formData.get(`attachment-${i}`)
    if (typeof file === 'string' || !file) continue

    const decoded = decodeAttachmentBuffer({
      filename: file.name,
      contentType: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
    }, { maxBytes })
    if (decoded) attachments.push(decoded)
  }

  return {
    to: formData.get('recipient'),
    attachments,
  }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? ''
  const parsed = contentType.includes('application/json')
    ? await parseJsonInboundEmail(req)
    : await parseMailgunInboundEmail(req)

  if (parsed instanceof NextResponse) return parsed

  const domain = process.env.INBOUND_EMAIL_DOMAIN ?? 'docs.intakedata.com'
  const toAddress = findInboundAddress(parsed.to, domain)

  if (!toAddress) return NextResponse.json({ ok: true })

  const [elder] = await db.select().from(elders).where(eq(elders.uniqueEmail, toAddress))
  if (!elder) return NextResponse.json({ ok: true })

  for (const attachment of parsed.attachments) {
    const { exceptions } = await processDocument({
      elderId: elder.id,
      buffer: attachment.buffer,
      mimeType: attachment.contentType,
      filename: attachment.filename,
    })

    if (exceptions.length > 0) {
      await sendExceptionAlert({
        userId: elder.userId,
        elderName: elder.name ?? 'your elder',
        exceptions,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
