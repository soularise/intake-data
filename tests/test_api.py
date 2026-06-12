import pytest
import base64
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-key-placeholder-xxxxx")
    monkeypatch.setenv("EXTRACTION_API_KEY", "test-secret-key")
    from importlib import reload
    import config
    reload(config)
    from main import app
    return TestClient(app)


@pytest.fixture
def auth_headers():
    return {"X-API-Key": "test-secret-key"}


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_list_document_types(client):
    resp = client.get("/v1/document_types")
    assert resp.status_code == 200
    types = [t["type"] for t in resp.json()["document_types"]]
    assert "intake_form" in types
    assert "insurance_card" in types


def test_extract_rejects_missing_api_key(client):
    resp = client.post("/v1/extract", json={
        "document_type": "intake_form",
        "file": base64.b64encode(b"%PDF fake").decode(),
    })
    assert resp.status_code == 401


def test_extract_missing_file_returns_422(client, auth_headers):
    resp = client.post(
        "/v1/extract",
        json={"document_type": "intake_form"},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_extract_invalid_base64_returns_400(client, auth_headers):
    resp = client.post("/v1/extract", json={
        "document_type": "intake_form",
        "file": "!!!not-base64!!!",
    }, headers=auth_headers)
    assert resp.status_code == 400
    data = resp.json()
    assert data["success"] is False
    assert "INVALID_INPUT" in data["error"]["code"]
    assert "sk-ant" not in data["error"]["message"]


def test_extract_unknown_mime_type_returns_400(client, auth_headers):
    zip_bytes = b"PK\x03\x04" + b"\x00" * 100
    encoded = base64.b64encode(zip_bytes).decode()
    resp = client.post("/v1/extract", json={
        "document_type": "intake_form",
        "file": encoded,
    }, headers=auth_headers)
    assert resp.status_code == 400
    assert resp.json()["success"] is False


def test_security_headers_present(client):
    resp = client.get("/health")
    assert resp.headers.get("x-frame-options") == "DENY"
    assert "no-store" in resp.headers.get("cache-control", "")
    assert resp.headers.get("strict-transport-security") is not None
