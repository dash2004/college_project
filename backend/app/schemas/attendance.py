from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AttendanceCreate(BaseModel):
    student_id: str
    confidence: float
    liveness_passed: bool
    photo_url: Optional[str] = None
    subject: Optional[str] = None
    time_slot: Optional[str] = None

class AttendanceResponse(BaseModel):
    id: int
    student_id: str
    student_name: str
    timestamp: datetime
    confidence: float
    liveness_passed: bool
    subject: Optional[str] = None
    time_slot: Optional[str] = None

    class Config:
        from_attributes = True

class VerificationRequest(BaseModel):
    image: str # Base64
    check_liveness: bool = True

