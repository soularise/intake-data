import { Resend } from 'resend'
import { sql } from 'drizzle-orm'
import { db } from './db'
import type { DetectedSignal } from './exceptions'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendExceptionAlert({
  userId,
  elderName,
  exceptions,
}: {
  userId: string
  elderName: string
  exceptions: DetectedSignal[]
}) {
  const rows = await db.execute(
    sql`SELECT email FROM "user" WHERE id = ${userId} LIMIT 1`
  ) as Array<{ email: string }>

  const caregiverEmail = rows[0]?.email
  if (!caregiverEmail) return

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.warn('Skipping exception alert because RESEND_API_KEY is not configured')
    return
  }

  const resend = new Resend(resendApiKey)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://intakedata.com'
  const from = process.env.ALERT_EMAIL_FROM ?? 'IntakeData <alerts@intakedata.com>'
  const bulletLines = exceptions.map((e) => `• ${e.description}`).join('\n')
  const bulletHtml = exceptions.map((e) => `<li>${escapeHtml(e.description)}</li>`).join('')
  const safeElderName = escapeHtml(elderName)
  const dashboardUrl = `${appUrl.replace(/\/$/, '')}/dashboard`

  await resend.emails.send({
    from,
    to: caregiverEmail,
    subject: `${elderName}'s documents need attention`,
    text: `We found something worth looking at for ${elderName}:\n\n${bulletLines}\n\nOpen your dashboard to review:\n${dashboardUrl}`,
    html: `
      <p>We found something worth looking at for <strong>${safeElderName}</strong>:</p>
      <ul>${bulletHtml}</ul>
      <p><a href="${dashboardUrl}">Open dashboard</a></p>
      <p style="color:#999;font-size:12px;">Forward a bill. We sort the rest. IntakeData</p>
    `,
  })
}
