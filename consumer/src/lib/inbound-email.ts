import { createHmac, timingSafeEqual } from 'crypto'

export const DEFAULT_INBOUND_MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const DEFAULT_INBOUND_MAX_ATTACHMENTS = 5

const MIME_SIGNATURES: Array<{ mimeType: string; matches: (buffer: Buffer) => boolean }> = [
  { mimeType: 'application/pdf', matches: (buffer) => buffer.subarray(0, 4).equals(Buffer.from('%PDF')) },
  { mimeType: 'image/png', matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mimeType: 'image/jpeg', matches: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  { mimeType: 'image/webp', matches: (buffer) => buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP' },
  { mimeType: 'image/heic', matches: (buffer) => buffer.length >= 12 && buffer.subarray(4, 8).toString() === 'ftyp' && ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(buffer.subarray(8, 12).toString()) },
]

const SUPPORTED_MIME_TYPES = new Set([...MIME_SIGNATURES.map((s) => s.mimeType), 'image/heif'])

export interface InboundAttachment {
  filename?: string
  content?: string
  contentType?: string
}

export interface DecodedAttachment {
  filename: string
  contentType: string
  buffer: Buffer
}

export interface BufferAttachment {
  filename?: string
  contentType?: string
  buffer: Buffer
}

function getAttachmentString(
  attachment: InboundAttachment | Record<string, unknown>,
  keys: string[],
): string | undefined {
  const record = attachment as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string') return value
  }
  return undefined
}

export function verifyWebhookSecret(provided: string | null, expected: string | undefined): boolean {
  if (!expected || !provided) return false

  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length) return false

  return timingSafeEqual(providedBuffer, expectedBuffer)
}

export function verifyMailgunSignature({
  signingKey,
  timestamp,
  token,
  signature,
  toleranceSeconds = 15 * 60,
  nowSeconds = Math.floor(Date.now() / 1000),
}: {
  signingKey: string | undefined
  timestamp: string | null
  token: string | null
  signature: string | null
  toleranceSeconds?: number
  nowSeconds?: number
}): boolean {
  if (!signingKey || !timestamp || !token || !signature) return false

  const timestampSeconds = Number(timestamp)
  if (!Number.isFinite(timestampSeconds)) return false
  if (Math.abs(nowSeconds - timestampSeconds) > toleranceSeconds) return false

  const expected = createHmac('sha256', signingKey)
    .update(`${timestamp}${token}`)
    .digest('hex')

  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length) return false

  return timingSafeEqual(providedBuffer, expectedBuffer)
}

export function getProvidedWebhookSecret(headers: Headers): string | null {
  const auth = headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length).trim()
  return headers.get('x-webhook-secret')
}

export function extractEmailAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim().toLowerCase()
  const angleMatch = trimmed.match(/<([^<>@\s]+@[^<>@\s]+)>/)
  if (angleMatch) return angleMatch[1]

  const bareMatch = trimmed.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
  return bareMatch?.[0]?.toLowerCase() ?? null
}

export function getToAddresses(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => {
        if (typeof entry === 'string') return [entry]
        if (entry && typeof entry === 'object') {
          const record = entry as Record<string, unknown>
          return [record.email, record.address, record.value]
        }
        return []
      })
      .map(extractEmailAddress)
      .filter((email): email is string => email != null)
  }

  const email = extractEmailAddress(value)
  return email ? [email] : []
}

export function findInboundAddress(to: unknown, domain: string): string | null {
  const normalizedDomain = domain.toLowerCase()
  return getToAddresses(to).find((address) => address.endsWith(`@${normalizedDomain}`)) ?? null
}

export function detectMimeType(buffer: Buffer): string | null {
  return MIME_SIGNATURES.find((signature) => signature.matches(buffer))?.mimeType ?? null
}

export function decodeAttachmentBuffer(
  attachment: BufferAttachment,
  options: {
    maxBytes?: number
  } = {},
): DecodedAttachment | null {
  const maxBytes = options.maxBytes ?? DEFAULT_INBOUND_MAX_ATTACHMENT_BYTES
  const declaredType = attachment.contentType?.toLowerCase()
  if (!declaredType || !SUPPORTED_MIME_TYPES.has(declaredType)) return null
  if (attachment.buffer.length === 0 || attachment.buffer.length > maxBytes) return null

  const detectedType = detectMimeType(attachment.buffer)
  if (!detectedType) return null
  const isCompatibleHeif = declaredType === 'image/heif' && detectedType === 'image/heic'
  if (detectedType !== declaredType && !isCompatibleHeif) return null

  return {
    filename: attachment.filename ?? 'attachment',
    contentType: declaredType,
    buffer: attachment.buffer,
  }
}

export function decodeAttachment(
  attachment: InboundAttachment | Record<string, unknown>,
  options: {
    maxBytes?: number
  } = {},
): DecodedAttachment | null {
  const maxBytes = options.maxBytes ?? DEFAULT_INBOUND_MAX_ATTACHMENT_BYTES
  const declaredType = getAttachmentString(attachment, ['contentType', 'ContentType', 'content_type', 'content-type'])?.toLowerCase()
  if (!declaredType || !SUPPORTED_MIME_TYPES.has(declaredType)) return null
  const content = getAttachmentString(attachment, ['content', 'Content', 'data', 'Data'])
  if (!content) return null

  const normalized = content.replace(/\s/g, '')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 === 1) {
    return null
  }

  const decoded = decodeAttachmentBuffer({
    filename: getAttachmentString(attachment, ['filename', 'Filename', 'name', 'Name']) ?? 'attachment',
    contentType: declaredType,
    buffer: Buffer.from(normalized, 'base64'),
  }, { maxBytes })

  return decoded
}
