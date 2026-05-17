import anthropic
from extractors.intake_form import IntakeFormExtractor
from extractors.insurance_card import InsuranceCardExtractor
from schemas import DocumentType


def get_extractor(document_type: DocumentType, client: anthropic.AsyncAnthropic):
    extractors = {
        DocumentType.INTAKE_FORM: IntakeFormExtractor,
        DocumentType.INSURANCE_CARD: InsuranceCardExtractor,
    }
    return extractors[document_type](client)
