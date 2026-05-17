import os
import pytest
from pathlib import Path

SAMPLE_DIR = Path(__file__).parent / "sample_data"

# Ground truth values matching what create_test_fixtures.py embeds in the first fixture
INTAKE_1_GROUND_TRUTH = {
    "patient_name": "Robert James Miller",
    "insurance_provider": "Blue Cross Blue Shield",
    "policy_number": "BCB987654321",
}

CARD_1_GROUND_TRUTH = {
    "insurance_company": "Blue Cross Blue Shield of Florida",
    "member_id": "BCB987654321",
}


@pytest.fixture
def sample_intake_pdf():
    path = SAMPLE_DIR / "sample_intake_1.pdf"
    if not path.exists():
        pytest.skip("Run scripts/create_test_fixtures.py first")
    return path


@pytest.fixture
def sample_card_png():
    path = SAMPLE_DIR / "sample_card_front_1.png"
    if not path.exists():
        pytest.skip("Run scripts/create_test_fixtures.py first")
    return path


@pytest.fixture
def api_key():
    key = os.getenv("ANTHROPIC_API_KEY", "")
    if not key or key.startswith("sk-ant-test"):
        pytest.skip("Real ANTHROPIC_API_KEY not set")
    return key
