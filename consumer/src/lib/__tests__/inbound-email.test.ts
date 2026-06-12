import { describe, expect, it } from 'vitest'
import { createHmac } from 'crypto'
import {
  decodeAttachment,
  findInboundAddress,
  getProvidedWebhookSecret,
  verifyMailgunSignature,
  verifyWebhookSecret,
} from '../inbound-email'

const MINIMAL_PNG_B64 = (
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk' +
  '+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
)

describe('inbound email helpers', () => {
  it('accepts bearer webhook secrets', () => {
    const headers = new Headers({ authorization: 'Bearer test-secret' })
    expect(getProvidedWebhookSecret(headers)).toBe('test-secret')
    expect(verifyWebhookSecret('test-secret', 'test-secret')).toBe(true)
  })

  it('rejects missing or mismatched webhook secrets', () => {
    expect(verifyWebhookSecret(null, 'expected')).toBe(false)
    expect(verifyWebhookSecret('wrong', 'expected')).toBe(false)
    expect(verifyWebhookSecret('expected', undefined)).toBe(false)
  })

  it('verifies Mailgun signatures', () => {
    const signingKey = 'mailgun-signing-key'
    const timestamp = '1800000000'
    const token = 'token-value'
    const signature = createHmac('sha256', signingKey)
      .update(`${timestamp}${token}`)
      .digest('hex')

    expect(verifyMailgunSignature({
      signingKey,
      timestamp,
      token,
      signature,
      nowSeconds: 1800000010,
    })).toBe(true)
  })

  it('rejects stale Mailgun signatures', () => {
    const signingKey = 'mailgun-signing-key'
    const timestamp = '1800000000'
    const token = 'token-value'
    const signature = createHmac('sha256', signingKey)
      .update(`${timestamp}${token}`)
      .digest('hex')

    expect(verifyMailgunSignature({
      signingKey,
      timestamp,
      token,
      signature,
      nowSeconds: 1800005000,
    })).toBe(false)
  })

  it('finds the IntakeData address in common provider shapes', () => {
    const address = findInboundAddress(
      [
        'Caregiver <caregiver@example.com>',
        { email: 'Mom <mom-abcd1234@docs.intakedata.com>' },
      ],
      'docs.intakedata.com',
    )
    expect(address).toBe('mom-abcd1234@docs.intakedata.com')
  })

  it('decodes supported attachments when declared type matches file bytes', () => {
    const decoded = decodeAttachment({
      filename: 'bill.png',
      contentType: 'image/png',
      content: MINIMAL_PNG_B64,
    })
    expect(decoded?.contentType).toBe('image/png')
    expect(decoded?.buffer.length).toBeGreaterThan(0)
  })

  it('decodes common provider attachment casing', () => {
    const decoded = decodeAttachment({
      Name: 'bill.png',
      ContentType: 'image/png',
      Content: MINIMAL_PNG_B64,
    })
    expect(decoded?.filename).toBe('bill.png')
  })

  it('rejects MIME spoofing', () => {
    const decoded = decodeAttachment({
      filename: 'bill.pdf',
      contentType: 'application/pdf',
      content: MINIMAL_PNG_B64,
    })
    expect(decoded).toBeNull()
  })

  it('rejects attachments over the size cap', () => {
    const decoded = decodeAttachment({
      filename: 'bill.png',
      contentType: 'image/png',
      content: MINIMAL_PNG_B64,
    }, { maxBytes: 4 })
    expect(decoded).toBeNull()
  })
})
