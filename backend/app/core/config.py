from pydantic_settings import BaseSettings
from typing import List, Union

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Attendance System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "CHANGE_THIS_TO_A_SECURE_SECRET_KEY"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8 days
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000", "http://localhost:5173"]
    
    # Database
    DATABASE_URL: str = "sqlite:///./sql_app.db"

    # Live Verification Thresholds
    LIVENESS_THRESHOLD: float = 0.85
    FACE_CONFIDENCE_THRESHOLD: float = 0.90
    MAX_VERIFICATION_ATTEMPTS: int = 3

    # Fast2SMS (SMS notifications)
    FAST2SMS_API_KEY: str = ""
    SMS_ENABLED: bool = False  # Set to True when API key is configured

    # Attendance thresholds
    ATTENDANCE_MIN_PERCENTAGE: float = 80.0  # Minimum required attendance %
    BEFORE_CLASS_REMINDER_MINUTES: int = 10  # Send reminder N minutes before class

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
