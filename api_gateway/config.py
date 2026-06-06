"""API Gateway configuration."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_database: str = "deprixa_plus"
    db_username: str = "root"
    db_password: str = ""
    redis_url: str = "redis://127.0.0.1:6379/1"
    api_host: str = "0.0.0.0"
    api_port: int = 8001
    cors_origins: str = "http://localhost:3000,http://localhost:8000"
    laravel_internal_url: str | None = None
    laravel_internal_timeout: int = 10
    log_payload_hash_only: bool = True
    # Set to True only in local/dev environments. In production keep False to hide
    # the interactive Swagger UI and OpenAPI schema from public exposure.
    enable_api_docs: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def database_url(self) -> str:
        return f"mysql+pymysql://{self.db_username}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_database}"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
