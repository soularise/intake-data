import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { elders } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { processDocument } from '@/lib/pipeline'
import { sendExceptionAlert } from '@/lib/email'

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

export async function POST(req: NextRequest) {
  const body = await req.json()

  const toAddresses: string[] = body.to ?? []
  const domain = process.env.INBOUND_EMAIL_DOMAIN ?? 'docs.intakedata.com'
  const toAddress = toAddresses.find((a: string) => a.endsWith(`@${domain}`))

  if (!toAddress) return NextResponse.json({ ok: true })

  const [elder] = await db.select().from(elders).where(eq(elders.uniqueEmail, toAddress))
  if (!elder) return NextResponse.json({ ok: true })

  const attachments: Array<{ filename: string; content: string; contentType: string }> =
    body.attachments ?? []

  const supported = attachments.filter((a) => SUPPORTED_MIME_TYPES.has(a.contentType))

  for (const attachment of supported) {
    const buffer = Buffer.from(attachment.content, 'base64')

    const { exceptions } = await processDocument({
      elderId: elder.id,
      buffer,
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
