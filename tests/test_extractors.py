import pytest
from unittest.mock import AsyncMock, MagicMock
import anthropic


@pytest.fixture
def mock_client():
    client = MagicMock(spec=anthropic.AsyncAnthropic)
    client.messages = MagicMock()
    client.messages.create = AsyncMock()
    return client


async def test_base_extractor_sends_pdf_as_document_type(mock_client):
    from extractors.base import BaseExtractor

    class Concrete(BaseExtractor):
        def get_system_prompt(self): return "Extract."

    extractor = Concrete(mock_client)
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text='{"field": {"value": "x", "confidence": 0.9}}')]
    )

    result = await extractor.extract(b"%PDF-1.4 test", "application/pdf")

    call_args = mock_client.messages.create.call_args
    content = call_args.kwargs["messages"][0]["content"][0]
    assert content["type"] == "document"
    assert content["source"]["media_type"] == "application/pdf"
    assert "fields" in result


async def test_base_extractor_sends_png_as_image_type(mock_client):
    from extractors.base import BaseExtractor

    class Concrete(BaseExtractor):
        def get_system_prompt(self): return "Extract."

    extractor = Concrete(mock_client)
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text='{"field": {"value": "y", "confidence": 0.8}}')]
    )

    await extractor.extract(b"\x89PNG\r\n\x1a\n test", "image/png")

    call_args = mock_client.messages.create.call_args
    content = call_args.kwargs["messages"][0]["content"][0]
    assert content["type"] == "image"
    assert content["source"]["media_type"] == "image/png"


async def test_base_extractor_system_prompt_has_cache_control(mock_client):
    from extractors.base import BaseExtractor

    class Concrete(BaseExtractor):
        def get_system_prompt(self): return "System prompt text."

    extractor = Concrete(mock_client)
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text="{}")]
    )

    await extractor.extract(b"%PDF-1.4", "application/pdf")

    call_args = mock_client.messages.create.call_args
    system = call_args.kwargs["system"]
    assert isinstance(system, list)
    assert system[0]["cache_control"] == {"type": "ephemeral"}


def test_parse_llm_response_valid_json():
    from extractors.base import BaseExtractor

    class Concrete(BaseExtractor):
        def get_system_prompt(self): return ""

    extractor = Concrete(MagicMock())
    raw = '{"patient_name": {"value": "John Smith", "confidence": 0.98}}'
    result = extractor.parse_llm_response(raw)
    assert result["patient_name"]["value"] == "John Smith"


def test_parse_llm_response_json_in_prose(mock_client):
    from extractors.base import BaseExtractor

    class Concrete(BaseExtractor):
        def get_system_prompt(self): return ""

    extractor = Concrete(mock_client)
    result = extractor.parse_llm_response(
        'Here is the data:\n{"name": {"value": "Jane", "confidence": 0.9}}'
    )
    assert result["name"]["value"] == "Jane"


def test_parse_llm_response_invalid_returns_error(mock_client):
    from extractors.base import BaseExtractor

    class Concrete(BaseExtractor):
        def get_system_prompt(self): return ""

    extractor = Concrete(mock_client)
    result = extractor.parse_llm_response("not json at all")
    assert "error" in result
