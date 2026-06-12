import base64
import hashlib
import logging
import time
from contextlib import asynccontextmanager
from typing import Optional

import anthropic
from fastapi import Depends, FastAPI, HTTPException, Request, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

from config import settings
from extractors import get_extractor
from schemas import DocumentType, ExtractRequest

logging.basicConfig(level=logging.INFO, format="%(message)s")
audit_logger = logging.getLogger("intakedata.audit")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.anthropic_client = anthropic.AsyncAnthropic(
        api_key=settings.ANTHROPIC_API_KEY
    )
    yield
    await app.state.anthropic_client.close()


app = FastAPI(title="IntakeData API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.middleware("http")
async def body_size_middleware(request: Request, call_next):
    if request.method == "POST":
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > settings.MAX_UPLOAD_BYTES:
            return JSONResponse(
                status_code=413,
                content={"success": False, "error": {
                    "code": "PAYLOAD_TOO_LARGE",
                    "message": f"Request body exceeds {settings.MAX_UPLOAD_BYTES // 1_048_576}MB limit",
                }},
            )
    return await call_next(request)


@app.middleware("http")
async def audit_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = int((time.time() - start_time) * 1000)

    raw_api_key = request.headers.get("x-api-key", "")
    if raw_api_key:
        api_key_log = hashlib.sha256(raw_api_key.encode()).hexdigest()[:12]
    else:
        api_key_log = "anonymous"
    ip_raw = request.client.host if request.client else "unknown"
    if ip_raw not in ("unknown", ""):
        parts = ip_raw.split(".")
        masked_ip = ".".join(parts[:2]) + ".x.x" if len(parts) == 4 else ip_raw
    else:
        masked_ip = "unknown"

    audit_logger.info(
        "AUDIT time=%s method=%s path=%s status=%d duration_ms=%d api_key=%s ip=%s ua=%s",
        time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        api_key_log,
        masked_ip,
        request.headers.get("user-agent", "unknown")[:100],
    )
    return response


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    if request.url.path in ("/", "/index.html"):
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "frame-ancestors 'none'"
        )
    else:
        csp = "default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'"
    response.headers["Content-Security-Policy"] = csp
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(key: Optional[str] = Security(_api_key_header)) -> str:
    import config as _config
    expected = _config.settings.EXTRACTION_API_KEY
    if not expected or key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return key


def _detect_mime_type(file_bytes: bytes) -> Optional[str]:
    if file_bytes[:4] == b"%PDF":
        return "application/pdf"
    if file_bytes[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if file_bytes[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if file_bytes[:4] == b"RIFF" and file_bytes[8:12] == b"WEBP":
        return "image/webp"
    if len(file_bytes) >= 8 and file_bytes[4:8] == b"ftyp":
        return "image/heic"
    return None


def _get_required_fields(document_type: DocumentType) -> list:
    if document_type == DocumentType.INTAKE_FORM:
        return ["patient_name", "date_of_birth", "phone_primary",
                "insurance_provider", "policy_number", "subscriber_name"]
    if document_type == DocumentType.INSURANCE_CARD:
        return ["insurance_company", "member_name", "member_id", "group_number"]
    return []


@app.get("/")
@app.get("/index.html")
async def root():
    return FileResponse("index.html")


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/v1/document_types")
async def list_document_types():
    return {
        "document_types": [
            {"type": "intake_form", "name": "Patient Intake Form",
             "description": "Medical intake/onboarding form for new patients", "field_count": 20},
            {"type": "insurance_card", "name": "Insurance Card",
             "description": "Health insurance card (front and/or back)", "field_count": 15},
        ]
    }


@app.post("/v1/extract")
async def extract_document(
    request_body: ExtractRequest,
    request: Request,
    _: str = Depends(require_api_key),
):
    start_time = time.time()

    try:
        file_bytes = base64.b64decode(request_body.file)
    except Exception:
        return JSONResponse(status_code=400, content={
            "success": False,
            "error": {"code": "INVALID_INPUT", "message": "Invalid base64 encoding"},
        })

    if len(file_bytes) > settings.MAX_UPLOAD_BYTES:
        return JSONResponse(status_code=413, content={
            "success": False,
            "error": {
                "code": "PAYLOAD_TOO_LARGE",
                "message": f"File exceeds {settings.MAX_UPLOAD_BYTES // 1_048_576}MB limit",
            },
        })

    mime_type = _detect_mime_type(file_bytes)
    if mime_type is None:
        return JSONResponse(status_code=400, content={
            "success": False,
            "error": {
                "code": "UNSUPPORTED_FILE_TYPE",
                "message": "File type not recognized. Supported: PDF, JPEG, PNG, WebP",
            },
        })

    try:
        extractor = get_extractor(request_body.document_type, request.app.state.anthropic_client)
        result = await extractor.extract(file_bytes, mime_type)

        fields = result["fields"]
        processing_time = int((time.time() - start_time) * 1000)

        if "error" in fields:
            return JSONResponse(status_code=422, content={
                "success": False,
                "error": {"code": "PARSE_ERROR", "message": "Could not parse extraction response"},
            })

        confidences = [v.get("confidence", 0) for v in fields.values() if isinstance(v, dict)]
        overall_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        required = _get_required_fields(request_body.document_type)
        missing = [f for f in required if fields.get(f, {}).get("confidence", 0) < 0.5]

        return {
            "success": True,
            "document_type": request_body.document_type.value,
            "processing_time_ms": processing_time,
            "confidence": round(overall_confidence, 2),
            "fields": fields,
            "missing_fields": missing,
        }

    except anthropic.APIError:
        return JSONResponse(status_code=502, content={
            "success": False,
            "error": {"code": "UPSTREAM_ERROR", "message": "Extraction service unavailable"},
        })
    except Exception:
        return JSONResponse(status_code=500, content={
            "success": False,
            "error": {"code": "EXTRACTION_ERROR", "message": "An unexpected error occurred"},
        })


class ConsumerBillRequest(BaseModel):
    file: str  # base64-encoded document


@app.post("/extract/consumer-bill")
async def extract_consumer_bill(
    request_body: ConsumerBillRequest,
    request: Request,
    _: str = Depends(require_api_key),
):
    try:
        file_bytes = base64.b64decode(request_body.file)
    except Exception:
        return JSONResponse(status_code=400, content={
            "success": False,
            "error": {"code": "INVALID_INPUT", "message": "Invalid base64 encoding"},
        })

    mime_type = _detect_mime_type(file_bytes)
    if mime_type is None:
        return JSONResponse(status_code=400, content={
            "success": False,
            "error": {
                "code": "UNSUPPORTED_FILE_TYPE",
                "message": "File type not recognized. Supported: PDF, JPEG, PNG, WebP, HEIC",
            },
        })

    from extractors.consumer_bill import ConsumerBillExtractor
    anthropic_client = getattr(request.app.state, "anthropic_client", None) or \
        anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    extractor = ConsumerBillExtractor(anthropic_client)
    result = await extractor.extract(file_bytes, mime_type)
    return {"success": True, "data": result}


class WaitlistRequest(BaseModel):
    email: str


@app.post("/waitlist")
async def join_waitlist(body: WaitlistRequest):
    email = body.email.strip().lower()
    if not email or "@" not in email:
        return JSONResponse(status_code=400, content={"success": False, "error": "Invalid email"})

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        logging.warning("Waitlist signup attempted but Supabase not configured: %s", email)
        return {"success": True}

    try:
        from supabase import create_client
        sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        sb.table("waitlist").insert({"email": email}).execute()
    except Exception:
        pass  # Duplicate email or transient error — return success either way

    return {"success": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=True)
