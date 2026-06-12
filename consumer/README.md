# IntakeData Consumer

Caregiver-facing web app for forwarding bills, extracting key fields, detecting exceptions, and showing what needs attention.

## Local Development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

The app expects the Python extraction service to be available at `EXTRACTION_API_URL` and protected by `EXTRACTION_API_KEY`.

## Required Environment

- `DATABASE_URL` - Supabase Postgres runtime URL, usually the transaction pooler on port `6543`.
- `DIRECT_DATABASE_URL` - optional direct/session URL for migrations. If omitted, scripts derive it from `DATABASE_URL` and `SUPABASE_PROJECT_REF`.
- `SUPABASE_PROJECT_REF` - required for migrations when `DATABASE_URL` uses the Supabase pooler and the project ref is not embedded in the username.
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` - server-side only, used for private document uploads.
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `EXTRACTION_API_URL`
- `EXTRACTION_API_KEY`
- `INBOUND_EMAIL_DOMAIN` - defaults to `docs.intakedata.com`.
- `MAILGUN_WEBHOOK_SIGNING_KEY` - required for Mailgun inbound routes.
- `INBOUND_EMAIL_WEBHOOK_SECRET` - required only for the JSON test/provider-neutral path.

Optional until outbound email is configured:

- `RESEND_API_KEY`
- `ALERT_EMAIL_FROM`

## Inbound Email Webhook

`POST /api/inbound-email` supports Mailgun inbound routes and a JSON test/provider-neutral path.

### Mailgun

Mailgun should forward inbound messages to:

```text
https://intakedata.com/api/inbound-email
```

Create a route with:

```text
Filter:  match_recipient(".*@docs.intakedata.com")
Actions: forward("https://intakedata.com/api/inbound-email")
         stop()
```

Set `MAILGUN_WEBHOOK_SIGNING_KEY` from Mailgun's webhook signing key. Mailgun posts `timestamp`, `token`, and `signature` fields, and the app verifies them before processing attachments.

### JSON Test Path

For manual tests or another provider adapter, send JSON and include either:

```http
Authorization: Bearer <INBOUND_EMAIL_WEBHOOK_SECRET>
```

or:

```http
X-Webhook-Secret: <INBOUND_EMAIL_WEBHOOK_SECRET>
```

Expected body shape:

```json
{
  "to": ["Mom <mom-1234abcd@docs.intakedata.com>"],
  "attachments": [
    {
      "filename": "bill.pdf",
      "contentType": "application/pdf",
      "content": "<base64>"
    }
  ]
}
```

The route only processes PDF, JPEG, PNG, WebP, HEIC, and HEIF attachments whose declared MIME type matches file bytes. It caps attachments at five per email and 10 MB each by default.

Common provider casing variants are accepted, including `To`, `Attachments`, `Name`, `ContentType`, and `Content`.

## Checks

```bash
npm test -- --run
npm run lint
npm run build
```

## Migrations

Runtime can use Supabase's transaction pooler, but DDL needs the direct/session connection. The existing migration scripts derive the direct URL from `DATABASE_URL`.

```bash
npx drizzle-kit generate
node scripts/migrate.mjs
node scripts/migrate-auth.mjs
```
