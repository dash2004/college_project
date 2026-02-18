from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date

from app.core.database import get_db
from app.models.student import Student
from app.models.attendance import Attendance
from app.core.dependencies import get_current_admin
from app.models.user import User

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_admin)
):
    total_students = db.query(Student).count()
    
    today_start = datetime.utcnow().date()
    today_attendance = db.query(Attendance).filter(func.date(Attendance.timestamp) == today_start).count() # Simply count logs
    # Distinct students
    present_students = db.query(Attendance.student_id).filter(func.date(Attendance.timestamp) == today_start).distinct().count()
    
    return {
        "total_students": total_students,
        "today_attendance_count": present_students,
        "security_level": "High",
        "model_status": "Ready"
    }
