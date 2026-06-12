import { randomBytes } from 'crypto'

export function generateUniqueEmail(name: string): string {
  const slug = name.trim()
    ? name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : 'elder'
  const suffix = randomBytes(4).toString('hex')
  const domain = process.env.INBOUND_EMAIL_DOMAIN ?? 'docs.intakedata.com'
  return `${slug}-${suffix}@${domain}`
}
