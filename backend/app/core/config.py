from typing import List

from pydantic import PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True)

    # API settings
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Database settings
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: str
    DB_NAME: str
    DATABASE_URI: PostgresDsn | None = None

    @field_validator("DATABASE_URI", mode="before")
    def assemble_db_connection(cls, v, values):
        if isinstance(v, str):
            return v
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=values.data.get("DB_USER"),
            password=values.data.get("DB_PASSWORD"),
            host=values.data.get("DB_HOST"),
            port=int(values.data.get("DB_PORT")),
            path=f"{values.data.get('DB_NAME') or ''}",
        )

    # Proxmox settings
    PROXMOX_HOST: str
    PROXMOX_USER: str
    PROXMOX_TOKEN_NAME: str
    PROXMOX_TOKEN_VALUE: str
    PROXMOX_VERIFY_SSL: bool = False

    # LDAP settings
    LDAP_ENABLED: bool = False
    LDAP_SERVER: str | None = None
    LDAP_BASE_DN: str | None = None
    LDAP_USER_DN: str | None = None
    LDAP_ADMIN_GROUP: str | None = None

    # OAuth settings
    OAUTH_ENABLED: bool = False
    GITLAB_CLIENT_ID: str | None = None
    GITLAB_CLIENT_SECRET: str | None = None
    GITLAB_CALLBACK_URL: str | None = None


settings = Settings()