from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Any


class Settings(BaseSettings):
    APP_NAME: str = "Bisdom"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    DATABASE_URL: str
    SYNC_DATABASE_URL: str

    AWS_BEARER_TOKEN_BEDROCK: str
    BEDROCK_MODEL_ID: str = "us.amazon.nova-pro-v1:0"
    BEDROCK_API_BASE: str = "https://bedrock.us-east-1.amazonaws.com"

    GST_API_KEY: str
    GST_API_BASE_URL: str = "https://sheet.gstincheck.co.in/check"

    STATIC_OTP: str = "123456"
    OTP_EXPIRE_MINUTES: int = 10

    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v: Any) -> List[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                import json
                return json.loads(v)
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
