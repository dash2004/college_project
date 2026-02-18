from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List, Dict


class ScheduleEntry(BaseModel):
    time_slot: str
    subject: str


class TimetableResponse(BaseModel):
    id: int
    branch: str
    student_class: str
    file_type: str
    notifications_enabled: bool
    start_date: Optional[date] = None
    created_at: datetime
    schedule_data: Optional[Dict[str, List[ScheduleEntry]]] = None  # day -> entries

    class Config:
        from_attributes = True


class CurrentClassInfo(BaseModel):
    current_subject: Optional[str] = None
    current_time_slot: Optional[str] = None
    upcoming_subject: Optional[str] = None
    upcoming_time_slot: Optional[str] = None
    upcoming_in_minutes: Optional[int] = None


class TimetableToggleResponse(BaseModel):
    id: int
    notifications_enabled: bool
