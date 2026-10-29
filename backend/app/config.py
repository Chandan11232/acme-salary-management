from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Runtime configuration, overridable via environment variables or backend/.env."""

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    database_url: str = f"sqlite:///{BACKEND_DIR / 'acme.db'}"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # AI assistant: the LLM parser is used only when an API key is configured;
    # otherwise (or on any LLM failure) the deterministic rule parser answers.
    anthropic_api_key: str | None = None
    ai_model: str = "claude-opus-5-5"
    ai_timeout_seconds: float = 20.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
