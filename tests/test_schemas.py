from pydantic import ValidationError
import pytest
from schemas import ExtractRequest, DocumentType, ExtractResponse, ErrorResponse


def test_extract_request_requires_fields():
    with pytest.raises(ValidationError):
        ExtractRequest()


def test_extract_request_valid():
    req = ExtractRequest(document_type=DocumentType.INTAKE_FORM, file="abc123")
    assert req.document_type == DocumentType.INTAKE_FORM


def test_error_response_success_is_false():
    err = ErrorResponse(error={"code": "E", "message": "bad"})
    assert err.success is False


def test_extract_response_defaults():
    resp = ExtractResponse(success=True, document_type=DocumentType.INTAKE_FORM)
    assert resp.confidence == 0.0
    assert resp.fields == {}
    assert resp.missing_fields == []
