import base64
import json
import re
import time
from abc import ABC, abstractmethod
from typing import Any, Dict

import anthropic


class BaseExtractor(ABC):
    def __init__(self, client: anthropic.AsyncAnthropic):
        self.client = client

    @abstractmethod
    def get_system_prompt(self) -> str:
        pass

    def parse_llm_response(self, response_text: str) -> Dict[str, Any]:
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        return {"error": {"value": None, "confidence": 0.0, "raw": response_text}}

    def _build_content_block(self, file_content: bytes, mime_type: str) -> dict:
        encoded = base64.b64encode(file_content).decode("utf-8")
        if mime_type == "application/pdf":
            return {
                "type": "document",
                "source": {"type": "base64", "media_type": "application/pdf", "data": encoded},
            }
        return {
            "type": "image",
            "source": {"type": "base64", "media_type": mime_type, "data": encoded},
        }

    async def extract(self, file_content: bytes, mime_type: str) -> Dict[str, Any]:
        start_time = time.time()

        response = await self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            timeout=30.0,
            system=[
                {
                    "type": "text",
                    "text": self.get_system_prompt(),
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": [self._build_content_block(file_content, mime_type)],
                }
            ],
        )

        processing_time = int((time.time() - start_time) * 1000)
        raw_text = next(
            (block.text for block in response.content if hasattr(block, "text")),
            ""
        )

        return {
            "fields": self.parse_llm_response(raw_text),
            "processing_time_ms": processing_time,
        }
