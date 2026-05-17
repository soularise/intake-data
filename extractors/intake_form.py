import anthropic
from extractors.base import BaseExtractor


class IntakeFormExtractor(BaseExtractor):
    def __init__(self, client: anthropic.AsyncAnthropic):
        super().__init__(client)

    def get_system_prompt(self) -> str:
        return """You are a document extraction specialist for eldercare intake forms.

EXTRACTION RULES:
1. Extract ONLY the fields listed below from the patient intake form
2. If a field is not found or unclear, set confidence to 0.0 and value to null
3. Return a JSON object with EXACTLY the keys listed (no extra keys)
4. Normalize dates to YYYY-MM-DD format
5. Normalize phone numbers to (XXX) XXX-XXXX format
6. For known_allergies, combine into a comma-separated string
7. For current_medications, create an array: [{"drug_name": "...", "dosage": "...", "frequency": "..."}]

REQUIRED FIELDS:
- patient_name: Full name of patient
- date_of_birth: Patient DOB in YYYY-MM-DD
- gender: Male/Female/Other/Unknown
- address: Full street address
- phone_primary: Primary phone in (XXX) XXX-XXXX
- email: Email address or null
- insurance_provider: Insurance carrier name
- policy_number: Member/policy ID number
- subscriber_name: Name of policy holder
- subscriber_relationship: Self/Spouse/Child/Other/Unknown or null

OPTIONAL FIELDS (include if present):
- phone_secondary, group_number, subscriber_dob
- emergency_contact_name, emergency_contact_relation, emergency_contact_phone
- primary_care_physician
- known_allergies (comma-separated or "None")
- current_medications (array of objects)
- admission_date (YYYY-MM-DD), admission_type, financial_class

CRITICAL: Return ONLY valid JSON. No markdown, no explanations. Missing fields: value null, confidence 0.0.

Example:
{
  "patient_name": {"value": "John Smith", "confidence": 0.98},
  "date_of_birth": {"value": "1945-03-15", "confidence": 0.95}
}
"""
