from pydantic_settings import BaseSettings
from pydantic import Field
from dataclasses import dataclass


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = Field(..., min_length=10)
    APP_ENV: str = "development"
    PORT: int = 8000
    MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024  # 10MB

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@dataclass(frozen=True)
class HIPAASettings:
    ENCRYPTION_AT_REST: str = "AES256"
    TLS_VERSION: str = "1.3"
    DATABASE_SSL_MODE: str = "require"
    DATA_RETENTION_DAYS: int = 30
    MAX_RETENTION_DAYS: int = 365
    AUDIT_LOG_RETENTION_YEARS: int = 3
    DELETION_GRACE_PERIOD_DAYS: int = 7


hipaa = HIPAASettings()
settings = Settings()
