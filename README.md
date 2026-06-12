# IntakeData

IntakeData is a caregiver-focused document exception detector. Families forward bills, statements, and notices to a unique address; IntakeData extracts the important fields and flags things that need attention.

The current repo has two parts:

- `main.py` and `extractors/` - FastAPI extraction service using Claude. This is intended to be called server-to-server.
- `consumer/` - Next.js consumer app with Better Auth, Supabase/Postgres, private document storage, inbound email ingestion, exception detection, and a dashboard.

## Current MVP Flow

1. A caregiver signs up in the consumer app.
2. They add a person to monitor.
3. The app creates a unique forwarding address under `docs.intakedata.com`.
4. An inbound email provider posts accepted attachments to `/api/inbound-email`.
5. The consumer app uploads the raw document to private Supabase Storage.
6. The consumer app calls the internal extraction service with `X-API-Key`.
7. The app stores extracted fields and detected exceptions.
8. The dashboard shows unresolved exceptions for the signed-in user.

## Python Extraction Service

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Set ANTHROPIC_API_KEY and EXTRACTION_API_KEY

uvicorn main:app --reload
```

Available endpoints:

- `GET /health`
- `GET /v1/document_types`
- `POST /v1/extract` - legacy intake/insurance extraction, protected by `X-API-Key`.
- `POST /extract/consumer-bill` - consumer bill extraction, protected by `X-API-Key`.

Supported file types are PDF, PNG, JPEG, WebP, and HEIC for the consumer bill endpoint. Uploads are capped by `MAX_UPLOAD_BYTES`.

## Consumer App

See [consumer/README.md](consumer/README.md).

```bash
cd consumer
cp .env.example .env.local
npm install
npm run dev
```

## Checks

```bash
./venv/bin/python -m pytest -q

cd consumer
npm test -- --run
npm run lint
npm run build
```

## Deployment Notes

- The Python extraction service should stay internal or API-key protected.
- The consumer app should own `intakedata.com`.
- The forwarding subdomain should be `docs.intakedata.com`.
- `/api/inbound-email` is provider-agnostic and requires `INBOUND_EMAIL_WEBHOOK_SECRET`.
- Outbound exception alerts are optional until an email provider is configured.

The existing root `vercel.json` deploys the Python service. The consumer app needs its own Vercel project or an adjusted monorepo deployment configuration.
