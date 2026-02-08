from typing import List
from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT_ENV, env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "quitotine"
    api_prefix: str = "/api/v1"

    database_url: str = "postgresql+psycopg2://quitotine:quitotine@localhost:5432/quitotine"
    secret_key: str = "dev-secret-change"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30
    diary_log_start_hour: int = 18

    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            return [v.strip() for v in value.split(",") if v.strip()]
        return value


settings = Settings()
