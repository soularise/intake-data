import { Resend } from 'resend'
import { sql } from 'drizzle-orm'
import { db } from './db'
import type { DetectedSignal } from './exceptions'

const resend = new Resend(process.env.RESEND_API_KEY)

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

  const bulletLines = exceptions.map((e) => `• ${e.description}`).join('\n')
  const bulletHtml = exceptions.map((e) => `<li>${e.description}</li>`).join('')

  await resend.emails.send({
    from: 'IntakeData <alerts@intakedata.com>',
    to: caregiverEmail,
    subject: `${elderName}'s documents need attention`,
    text: `We found something worth looking at for ${elderName}:\n\n${bulletLines}\n\nOpen your dashboard to review:\nhttps://intakedata.com/dashboard`,
    html: `
      <p>We found something worth looking at for <strong>${elderName}</strong>:</p>
      <ul>${bulletHtml}</ul>
      <p><a href="https://intakedata.com/dashboard">Open dashboard →</a></p>
      <p style="color:#999;font-size:12px;">Forward a bill. We sort the rest. — IntakeData</p>
    `,
  })
}
