from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, date, timedelta

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
    today_attendance = db.query(Attendance).filter(func.date(Attendance.timestamp) == today_start).count()
    # Distinct students
    present_students = db.query(Attendance.student_id).filter(func.date(Attendance.timestamp) == today_start).distinct().count()
    
    return {
        "total_students": total_students,
        "today_attendance_count": present_students,
        "security_level": "High",
        "model_status": "Ready"
    }


@router.get("/trends")
def get_attendance_trends(
    db: Session = Depends(get_db),
):
    """
    Returns real attendance trend data from the database.
    - Daily: distinct student count per day for the last 14 days
    - Recent activity: last 10 attendance logs
    """
    today = date.today()
    
    # --- Daily trends (last 14 days) ---
    daily_data = []
    for i in range(13, -1, -1):  # 14 days ago to today
        d = today - timedelta(days=i)
        count = db.query(Attendance.student_id).filter(
            func.date(Attendance.timestamp) == d
        ).distinct().count()
        
        day_label = d.strftime("%a")  # "Mon", "Tue", etc.
        date_label = d.strftime("%d/%m")  # "24/02"
        
        daily_data.append({
            "day": day_label,
            "date": date_label,
            "full_date": d.isoformat(),
            "students": count
        })
    
    # --- Weekly summary (last 4 weeks) ---
    weekly_data = []
    for w in range(3, -1, -1):
        week_start = today - timedelta(days=today.weekday() + (w * 7))
        week_end = week_start + timedelta(days=6)
        
        count = db.query(Attendance.student_id).filter(
            func.date(Attendance.timestamp) >= week_start,
            func.date(Attendance.timestamp) <= week_end
        ).distinct().count()
        
        total_logs = db.query(Attendance).filter(
            func.date(Attendance.timestamp) >= week_start,
            func.date(Attendance.timestamp) <= week_end
        ).count()
        
        weekly_data.append({
            "week": f"W{4 - w}",
            "range": f"{week_start.strftime('%d/%m')} - {week_end.strftime('%d/%m')}",
            "unique_students": count,
            "total_logs": total_logs
        })
    
    # --- Recent activity (last 10 logs) ---
    recent = db.query(Attendance, Student.name).join(
        Student, Attendance.student_id == Student.id
    ).order_by(Attendance.timestamp.desc()).limit(10).all()
    
    recent_activity = []
    for log, name in recent:
        recent_activity.append({
            "student_name": name,
            "student_id": log.student_id,
            "subject": log.subject,
            "time_slot": log.time_slot,
            "timestamp": log.timestamp.isoformat(),
            "confidence": log.confidence
        })
    
    return {
        "daily": daily_data,
        "weekly": weekly_data,
        "recent_activity": recent_activity
    }

