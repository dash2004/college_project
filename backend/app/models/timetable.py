from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, UniqueConstraint
from app.core.database import Base
from datetime import datetime, date


class Timetable(Base):
    __tablename__ = "timetables"

    id = Column(Integer, primary_key=True, index=True)
    branch = Column(String, nullable=False, index=True)
    student_class = Column(String, nullable=False, index=True)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # "xlsx", "png", "jpg", etc.
    schedule_data = Column(Text, nullable=True)  # JSON string of parsed schedule (Excel only)
    notifications_enabled = Column(Boolean, default=True)
    start_date = Column(Date, nullable=True, default=date.today)  # Term/semester start date
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("branch", "student_class", name="uq_branch_class"),
    )
