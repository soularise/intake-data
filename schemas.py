from pydantic import BaseModel, Field
from typing import Any, Dict, List, Literal, Optional
from enum import Enum


class DocumentType(str, Enum):
    INTAKE_FORM = "intake_form"
    INSURANCE_CARD = "insurance_card"


class ExtractRequest(BaseModel):
    document_type: DocumentType
    file: str = Field(..., description="Raw base64-encoded PDF or image (no data URI prefix)")


class ExtractField(BaseModel):
    value: Optional[Any] = None
    confidence: float = 0.0
    raw_text: Optional[str] = None


class ExtractResponse(BaseModel):
    success: bool
    document_type: DocumentType
    processing_time_ms: int = 0
    confidence: float = 0.0
    fields: Dict[str, ExtractField] = {}
    missing_fields: List[str] = []


class ErrorResponse(BaseModel):
    success: Literal[False] = False
    error: Dict[str, Any]
