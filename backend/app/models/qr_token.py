from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from datetime import datetime, timedelta
import uuid

from app.core.database import Base


class QRToken(Base):
    __tablename__ = "qr_tokens"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    token = Column(String, unique=True, nullable=False, index=True)
    student_id = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    time_slot = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)

    @staticmethod
    def create_token(student_id: str, subject: str = None, time_slot: str = None, ttl_minutes: int = 5):
        """Create a new QR token with expiry."""
        now = datetime.utcnow()
        return QRToken(
            token=str(uuid.uuid4()),
            student_id=student_id,
            subject=subject,
            time_slot=time_slot,
            created_at=now,
            expires_at=now + timedelta(minutes=ttl_minutes),
            used=False,
        )
