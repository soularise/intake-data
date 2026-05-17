# IntakeData Test Page — Design Spec

**Date:** 2026-05-17  
**Status:** Approved

---

## Goal

A single standalone HTML file (`test.html`) that lets a user upload an eldercare document, send it to the IntakeData Vercel API, and see the extracted fields with confidence scores. Polished enough for proof-of-concept demos; no build step required.

---

## Tech Stack

- **Tailwind CSS v3** — via CDN
- **Alpine.js v3** — via CDN, for reactive state (loading, results, expand/collapse)
- **Vanilla `fetch`** — for the API call
- **`FileReader` API** — for client-side base64 encoding
- No npm, no build step. Open with `open test.html`.

---

## Layout & States

### State 1: Upload (initial)

Centered card on a light gray background.

- **Header bar** (dark navy): IntakeData wordmark + tagline ("Eldercare Document Extraction")
- **API URL input**: small editable field pre-filled with the Vercel production URL; can be overridden to `http://localhost:8000` for local dev
- **Document type selector**: segmented control / radio pill — "Patient Intake Form" | "Insurance Card"
- **File drop zone**: dashed border, "Drop a PDF or image here, or click to browse". Highlights on hover/drag-over. Accepts PDF, PNG, JPG, WebP. Shows filename + file size once selected.
- **Submit button**: "Extract Fields" — disabled until a file is selected. Shows spinner + "Extracting…" during the API call.

### State 2: Results (after successful extraction)

Upload card collapses to a compact top bar (doc type badge + "Upload another →" button). Results panel fills the page below.

**Results panel sections:**

1. **Stats strip** (top of results)
   - Overall confidence score with color coding: green ≥80%, amber 50–79%, red <50%
   - Processing time in ms
   - Document type badge

2. **Key fields summary card**
   - Intake form: `patient_name`, `date_of_birth`, `gender`, `phone_primary`, `insurance_provider`, `policy_number`, `subscriber_name`, `subscriber_relationship`
   - Insurance card: `insurance_company`, `member_name`, `member_id`, `group_number`, `plan_type`, `rx_bin`, `customer_service_phone`
   - Each field shown as a label + value row with a small confidence pill (colored green/amber/red)
   - Null/missing values shown as `—` in muted gray

3. **"View all fields" accordion**
   - Collapsed by default, click to expand
   - Full table: Field | Value | Confidence — all fields returned by the API
   - Sorted by confidence descending

4. **Missing fields callout** (only shown if `missing_fields` array is non-empty)
   - Amber warning box listing fields below the 50% confidence threshold

### State 3: Error

If the API returns an error or the fetch fails, a red error banner replaces the results panel with the error code and message. "Try again" button resets to State 1.

---

## Behavior Details

- **MIME type detection**: inferred from file extension (`.pdf` → `application/pdf`, `.png` → `image/png`, `.jpg`/`.jpeg` → `image/jpeg`, `.webp` → `image/webp`). Unsupported extensions show an inline error before submitting.
- **File size guard**: warn (not block) if file is over 8MB before sending, since the API enforces 10MB.
- **Base64 encoding**: done client-side via `FileReader.readAsDataURL`, strip the `data:...;base64,` prefix before sending.
- **"Upload another"**: resets Alpine state back to State 1 without page reload.
- **No authentication**: the API has no auth in the prototype; the test page sends no `x-api-key` header.

---

## Visual Style

- Background: `gray-50`
- Card: white, `rounded-xl`, `shadow-md`
- Header: `slate-900` background, white text
- Confidence colors: `green-500` (≥0.80), `amber-500` (0.50–0.79), `red-500` (<0.50)
- File drop zone: `border-dashed border-2 border-slate-300`, highlights to `border-blue-500` on hover/drag
- Submit button: `blue-600` with hover state, disabled state in `gray-300`
- Font: system UI stack (Tailwind default)

---

## File Delivery

- Single file: `test.html` in the project root
- Hardcoded API URL default: `https://intake-data-git-main-soularises-projects.vercel.app`
- Committed to git in the project root alongside `main.py`

---

## Out of Scope

- Authentication / API key input
- Multi-file batch upload
- Result history / session storage
- Mobile optimization (desktop-first for demo use)
