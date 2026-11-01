"""All settings in one place, loaded from environment variables / .env file."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_expire_minutes: int = 10080  # 7 days
    google_client_id: str = ""
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
