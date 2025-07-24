import os
from typing import Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "postgresql://localhost/heor_signal")
    # Fallback database URL for SSL issues
    database_url_fallback: str = os.getenv("DATABASE_URL_FALLBACK", "postgresql://localhost/heor_signal?sslmode=disable")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    environment: str = os.getenv("ENVIRONMENT", "development")
    port: int = int(os.getenv("PORT", "8000"))
    
    # API Keys for news agents
    nih_api_key: str = os.getenv("NIH_API_KEY", "3b04360966005dfdf1f14d28ef9a17961908")
    serp_api_key: str = os.getenv("SERP_API_KEY", "6a4387c40c2ca137f3cd364618e4e3eefd35d9a508f1c7093bb6edf0e951e764")
    
    # SSL Configuration
    ssl_mode: str = os.getenv("SSL_MODE", "require")  # require, verify-full, disable
    ssl_verify: bool = os.getenv("SSL_VERIFY", "true").lower() == "true"
    
    class Config:
        env_file = ".env"

settings = Settings()
