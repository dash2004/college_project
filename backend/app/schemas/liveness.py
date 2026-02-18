from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

class LivenessCheckRequest(BaseModel):
    frames: List[str] # List of base64 images
    challenge_type: str = "blink" # blink, turn_left, turn_right, combined

class LivenessResponse(BaseModel):
    passed: bool
    liveness_score: float
    blink_count: int
    motion_passed: bool
    details: str
    best_frame_index: Optional[int] = None

class FaceVerificationRequest(BaseModel):
    video_frames: List[str] # 30 frames
    timestamp: Optional[str] = None
    location: Optional[dict] = None

class VerificationAttemptLog(BaseModel):
    timestamp: datetime
    success: bool
    failure_reason: Optional[str] = None
    liveness_score: float
    confidence: float
