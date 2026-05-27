# IntakeData

HIPAA-ready document extraction API for eldercare. Extracts structured fields from patient intake forms and insurance cards using Claude.

**Live:** https://intake-data.vercel.app

---

## What it does

Accepts a base64-encoded PDF or image, runs it through Claude, and returns structured JSON with per-field confidence scores. Supports two document types:

- **Patient Intake Form** — 20 fields including patient name, DOB, phone, insurance provider, policy number, subscriber info
- **Insurance Card** — 15 fields including insurance company, member name/ID, group number, plan type, RX BIN, customer service phone

---

## API

### `GET /health`
Returns `{"status": "healthy"}`.

### `GET /v1/document_types`
Lists supported document types and field counts.

### `POST /v1/extract`

**Request body:**
```json
{
  "document_type": "intake_form",
  "file": "<base64-encoded file, no data URI prefix>"
}
```

`document_type` must be `intake_form` or `insurance_card`.

Supported file types: PDF, PNG, JPEG, WebP. Max size: 10 MB.

**Response:**
```json
{
  "success": true,
  "document_type": "intake_form",
  "processing_time_ms": 1842,
  "confidence": 0.91,
  "fields": {
    "patient_name": { "value": "Robert James Miller", "confidence": 0.98, "raw_text": "Robert James Miller" },
    "date_of_birth": { "value": "1942-06-15", "confidence": 0.95, "raw_text": "06/15/1942" }
  },
  "missing_fields": []
}
```

`missing_fields` lists required fields where confidence fell below 0.5.

---

## Local development

**Requirements:** Python 3.11+, an Anthropic API key.

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

uvicorn main:app --reload
# API available at http://localhost:8000
```

### Interactive test UI

Open `test.html` directly in a browser. It defaults to the live Vercel URL — change the API URL field at the top to `http://localhost:8000` to hit your local server instead.

---

## Tests

```bash
# Unit tests (no external dependencies)
pytest -m "not integration"

# Integration tests (requires ANTHROPIC_API_KEY and sample fixtures)
python scripts/create_test_fixtures.py
pytest -m integration
```

---

## Deployment

Deployed via Vercel. Push to `main` triggers a deploy automatically.

`vercel.json` routes all requests to the FastAPI app via `@vercel/python`. The landing page (`index.html`) is served from the `GET /` route.

**Required environment variable in Vercel:** `ANTHROPIC_API_KEY`

---

## Project structure

```
main.py          — FastAPI app, routes, middleware
config.py        — Settings (pydantic-settings) and HIPAA constants
schemas.py       — Request/response models
extractors/      — Document-type-specific extraction logic
tests/           — pytest suite
scripts/         — Test fixture generation
index.html       — Marketing landing page (served at /)
test.html        — Interactive extraction console
vercel.json      — Vercel deployment config
```
