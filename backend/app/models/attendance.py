from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("students.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    confidence = Column(Float)
    liveness_passed = Column(Boolean, default=False)
    photo_url = Column(String, nullable=True) # Path to proof photo
    subject = Column(String, nullable=True)    # "Mathematics"
    time_slot = Column(String, nullable=True)  # "09:00-10:00"

    # student = relationship("Student", back_populates="attendance_logs")

