import os
import pytest


def test_settings_loads_from_env(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-xxxxxxxxxxxx")
    from importlib import reload
    import config
    reload(config)
    assert config.settings.ANTHROPIC_API_KEY == "sk-ant-test-xxxxxxxxxxxx"


def test_settings_has_hipaa_defaults(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test-xxxxxxxxxxxx")
    from importlib import reload
    import config
    reload(config)
    from config import hipaa
    assert hipaa.DATA_RETENTION_DAYS == 30
    assert hipaa.AUDIT_LOG_RETENTION_YEARS == 3
