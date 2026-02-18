from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey
from app.core.database import Base
from datetime import datetime

class VerificationAttempt(Base):
    __tablename__ = "verification_attempts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    student_id = Column(String, nullable=True) # Null if unknown
    
    liveness_score = Column(Float, default=0.0)
    confidence = Column(Float, default=0.0)
    passed = Column(Boolean, default=False)
    
    failure_reason = Column(String, nullable=True) # "Low Liveness", "Face Mismatch", etc.
    snapshot_path = Column(String, nullable=True) # Path to saved frame
