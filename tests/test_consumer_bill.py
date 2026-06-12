import base64
import pytest
from fastapi.testclient import TestClient


MINIMAL_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"
    "+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)
MINIMAL_PNG_BYTES = base64.b64decode(MINIMAL_PNG_B64)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-key-placeholder-xxxxx")
    monkeypatch.setenv("EXTRACTION_API_KEY", "test-secret-key")
    from importlib import reload
    import config
    reload(config)
    from main import app
    return TestClient(app)


def test_consumer_bill_rejects_missing_api_key(client):
    resp = client.post(
        "/extract/consumer-bill",
        json={"file": MINIMAL_PNG_B64},
    )
    assert resp.status_code == 401


def test_consumer_bill_rejects_wrong_api_key(client):
    resp = client.post(
        "/extract/consumer-bill",
        json={"file": MINIMAL_PNG_B64},
        headers={"X-API-Key": "wrong-key"},
    )
    assert resp.status_code == 401


def test_consumer_bill_rejects_invalid_base64(client):
    resp = client.post(
        "/extract/consumer-bill",
        json={"file": "!!!not-base64!!!"},
        headers={"X-API-Key": "test-secret-key"},
    )
    assert resp.status_code == 400
    assert resp.json()["success"] is False


def test_consumer_bill_rejects_unsupported_mime_type(client):
    # ZIP magic bytes
    zip_bytes = b"PK\x03\x04" + b"\x00" * 100
    resp = client.post(
        "/extract/consumer-bill",
        json={"file": base64.b64encode(zip_bytes).decode()},
        headers={"X-API-Key": "test-secret-key"},
    )
    assert resp.status_code == 400
    assert resp.json()["success"] is False


def test_consumer_bill_accepts_heic_mime(client, monkeypatch):
    # HEIC magic: 4 null bytes + "ftyp"
    heic_bytes = b"\x00\x00\x00\x00ftyp" + b"\x00" * 100
    encoded = base64.b64encode(heic_bytes).decode()

    # Mock the extractor so we don't call Claude
    async def mock_extract(self, file_content, mime_type):
        return {"vendor_name": "Test", "amount": None, "due_date": None,
                "document_date": None, "document_type": "utility_bill",
                "account_number": None, "is_overdue": False,
                "is_final_notice": False, "has_urgent_language": False,
                "prior_amount": None, "raw_text": ""}

    monkeypatch.setattr(
        "extractors.consumer_bill.ConsumerBillExtractor.extract",
        mock_extract,
    )
    resp = client.post(
        "/extract/consumer-bill",
        json={"file": encoded},
        headers={"X-API-Key": "test-secret-key"},
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True
