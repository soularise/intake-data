import json
import re

from .base import BaseExtractor

CONSUMER_BILL_PROMPT = """Extract information from this financial document. Return only valid JSON with these exact fields:

{
  "vendor_name": "Company or entity name that sent this document, or null",
  "document_type": "One of: utility_bill, insurance_statement, bank_statement, medical_bill, tax_document, subscription_notice, credit_card_statement, legal_notice, other",
  "amount": numeric amount due or charged with no currency symbols (e.g. 147.50), or null,
  "due_date": "Payment due date in YYYY-MM-DD format, or null",
  "document_date": "Date on the document in YYYY-MM-DD format, or null",
  "account_number": "Account or policy number as a string, or null",
  "is_overdue": true if document says past due / overdue / late payment, false otherwise,
  "is_final_notice": true if document says final notice / last notice / collections pending, false otherwise,
  "has_urgent_language": true if document says immediate action required / suspension notice / termination warning / service interruption, false otherwise,
  "prior_amount": previous period amount as a number if a rate change is visible, or null,
  "raw_text": "Full text content of the document"
}

Return only valid JSON. No markdown, no explanation."""


class ConsumerBillExtractor(BaseExtractor):
    def get_system_prompt(self) -> str:
        return ""

    async def extract(self, file_content: bytes, mime_type: str) -> dict:
        content_block = self._build_content_block(file_content, mime_type)

        response = await self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        content_block,
                        {"type": "text", "text": CONSUMER_BILL_PROMPT},
                    ],
                }
            ],
        )

        raw_text = next(
            (block.text for block in response.content if hasattr(block, "text")),
            ""
        )

        json_match = re.search(r'\{[\s\S]*\}', raw_text)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        return {}
