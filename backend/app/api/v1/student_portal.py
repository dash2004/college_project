from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, date, timedelta
import json
import calendar

from app.core.database import get_db
from app.core.dependencies import get_current_student
from app.models.attendance import Attendance
from app.models.timetable import Timetable
from app.models.student import Student

router = APIRouter()


def _normalize_day_schedule(day_data):
    """Convert day schedule to {time_slot: subject} dict regardless of input format.
    Handles:
      - list of dicts: [{time_slot: '09:00-10:00', subject: 'Math'}, ...]
      - dict: {'09:00-10:00': 'Math', ...}
    """
    result = {}
    if isinstance(day_data, list):
        for entry in day_data:
            if isinstance(entry, dict) and 'time_slot' in entry:
                result[entry['time_slot']] = entry.get('subject', '')
    elif isinstance(day_data, dict):
        for slot, val in day_data.items():
            if isinstance(val, dict):
                result[slot] = val.get('subject', str(val))
            else:
                result[slot] = str(val) if val else ''
    return result


@router.get("/me")
def get_my_profile(current: dict = Depends(get_current_student)):
    """Get logged-in student's profile info."""
    user = current["user"]
    student = current["student"]
    return {
        "student_id": student.id,
        "name": student.name,
        "email": user.email,
        "branch": student.branch,
        "student_class": student.student_class,
        "semester": student.semester,
        "phone_number": student.phone_number,
    }


@router.get("/dashboard")
def get_student_dashboard(
    current: dict = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Student dashboard: today's classes, attendance status, overall stats."""
    student = current["student"]
    today = date.today()
    day_name = today.strftime("%A")  # "Monday", "Tuesday", etc.

    # --- Get timetable ---
    tt = db.query(Timetable).filter(
        Timetable.branch == (student.branch.upper() if student.branch else ""),
        Timetable.student_class == (student.student_class.upper() if student.student_class else ""),
    ).first()

    today_classes = []
    schedule_data = None
    if tt and tt.schedule_data:
        try:
            schedule_data = json.loads(tt.schedule_data) if isinstance(tt.schedule_data, str) else tt.schedule_data
        except (json.JSONDecodeError, TypeError):
            schedule_data = None

    if schedule_data and isinstance(schedule_data, dict):
        day_schedule = _normalize_day_schedule(schedule_data.get(day_name, []))
        for time_slot, subject in day_schedule.items():
            if subject and str(subject).strip().upper() not in ("", "FREE", "BREAK", "LUNCH", "-", "NA", "N/A"):
                today_classes.append({"time_slot": time_slot, "subject": str(subject).strip()})

    # --- Check attendance for today's classes ---
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    today_attendance = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.timestamp >= today_start,
        Attendance.timestamp <= today_end,
    ).all()

    attended_slots = {a.time_slot for a in today_attendance if a.time_slot}

    classes_with_status = []
    from datetime import time as dtime
    now = datetime.now()
    for cls in today_classes:
        status = "upcoming"
        if cls["time_slot"] in attended_slots:
            status = "present"
        else:
            # Check if the class time has passed
            try:
                end_time_str = cls["time_slot"].split("-")[-1].strip()
                end_hour, end_min = map(int, end_time_str.split(":"))
                class_end = datetime.combine(today, dtime(end_hour, end_min))
                if now > class_end:
                    status = "absent"
            except (ValueError, IndexError):
                pass
        classes_with_status.append({**cls, "status": status})

    # --- Overall attendance percentage ---
    from app.utils.timetable_parser import count_total_classes
    from app.utils.sms_service import calculate_shortage

    total_classes = 0
    attended_classes = 0
    if tt and tt.schedule_data and tt.start_date:
        total_classes = count_total_classes(tt.schedule_data, tt.start_date, today)
        sd = datetime.combine(tt.start_date, datetime.min.time())
        ed = datetime.combine(today, datetime.max.time())
        attended_classes = db.query(Attendance).filter(
            Attendance.student_id == student.id,
            Attendance.timestamp >= sd,
            Attendance.timestamp <= ed,
            Attendance.time_slot.isnot(None),
        ).count()

    shortage = calculate_shortage(attended_classes, total_classes)

    return {
        "student_name": student.name,
        "today_classes": classes_with_status,
        "attendance_summary": {
            "attended": attended_classes,
            "total": total_classes,
            "percentage": shortage["percentage"],
            "status": shortage["status"],
            "classes_needed": shortage["classes_needed"],
            "can_skip": shortage.get("can_skip", 0),
            "message": shortage["message"],
        },
    }


@router.get("/attendance/history")
def get_attendance_history(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020),
    current: dict = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Get student's attendance history for calendar view."""
    student = current["student"]
    today = date.today()

    # Default to current month
    target_year = year or today.year
    target_month = month or today.month
    month_start = date(target_year, target_month, 1)
    last_day = calendar.monthrange(target_year, target_month)[1]
    month_end = date(target_year, target_month, last_day)
    if month_end > today:
        month_end = today

    sd = datetime.combine(month_start, datetime.min.time())
    ed = datetime.combine(month_end, datetime.max.time())

    records = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.timestamp >= sd,
        Attendance.timestamp <= ed,
    ).order_by(Attendance.timestamp.asc()).all()

    # Build day-by-day data
    history = []
    for record in records:
        history.append({
            "date": record.timestamp.strftime("%Y-%m-%d"),
            "subject": record.subject,
            "time_slot": record.time_slot,
            "timestamp": record.timestamp.isoformat(),
            "confidence": record.confidence,
        })

    # Get timetable for determining which days had classes
    tt = db.query(Timetable).filter(
        Timetable.branch == (student.branch.upper() if student.branch else ""),
        Timetable.student_class == (student.student_class.upper() if student.student_class else ""),
    ).first()

    # Build calendar data: for each day, mark present/absent/no-class
    calendar_data = []
    schedule_data = None
    if tt and tt.schedule_data:
        try:
            schedule_data = json.loads(tt.schedule_data) if isinstance(tt.schedule_data, str) else tt.schedule_data
        except (json.JSONDecodeError, TypeError):
            schedule_data = None

    attended_dates = {}
    for r in records:
        d = r.timestamp.strftime("%Y-%m-%d")
        if d not in attended_dates:
            attended_dates[d] = []
        attended_dates[d].append(r.subject or "Unknown")

    current_date = month_start
    while current_date <= month_end:
        day_name = current_date.strftime("%A")
        day_str = current_date.strftime("%Y-%m-%d")

        has_classes = False
        total_day_classes = 0
        if schedule_data and isinstance(schedule_data, dict):
            day_schedule = _normalize_day_schedule(schedule_data.get(day_name, []))
            for _, subject in day_schedule.items():
                if subject and str(subject).strip().upper() not in ("", "FREE", "BREAK", "LUNCH", "-", "NA", "N/A"):
                    has_classes = True
                    total_day_classes += 1

        attended_count = len(attended_dates.get(day_str, []))

        if current_date.weekday() == 6:  # Sunday
            status = "holiday"
        elif not has_classes:
            status = "no-class"
        elif attended_count > 0:
            status = "present" if attended_count >= total_day_classes else "partial"
        else:
            status = "absent" if current_date < today else "upcoming"

        calendar_data.append({
            "date": day_str,
            "day": day_name[:3],
            "status": status,
            "classes_attended": attended_count,
            "total_classes": total_day_classes,
        })
        current_date += timedelta(days=1)

    return {
        "month": target_month,
        "year": target_year,
        "month_name": calendar.month_name[target_month],
        "records": history,
        "calendar": calendar_data,
    }


@router.get("/attendance/subject-wise")
def get_subject_wise_attendance(
    current: dict = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Get per-subject attendance breakdown."""
    student = current["student"]
    today = date.today()

    tt = db.query(Timetable).filter(
        Timetable.branch == (student.branch.upper() if student.branch else ""),
        Timetable.student_class == (student.student_class.upper() if student.student_class else ""),
    ).first()

    schedule_data = None
    if tt and tt.schedule_data:
        try:
            schedule_data = json.loads(tt.schedule_data) if isinstance(tt.schedule_data, str) else tt.schedule_data
        except (json.JSONDecodeError, TypeError):
            schedule_data = None

    # Count total classes per subject from timetable
    subject_total = {}
    if schedule_data and isinstance(schedule_data, dict) and tt.start_date:
        # Count occurrences per day of week
        subject_per_day = {}
        for day_name, slots in schedule_data.items():
            normalized_slots = _normalize_day_schedule(slots)
            for _, subject in normalized_slots.items():
                subj = str(subject).strip() if subject else ""
                if subj.upper() not in ("", "FREE", "BREAK", "LUNCH", "-", "NA", "N/A"):
                    key = (day_name, subj)
                    subject_per_day[key] = subject_per_day.get(key, 0) + 1

        # Count actual days from start_date to today
        day_map = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6}
        current_date = tt.start_date
        while current_date <= today:
            day_name = current_date.strftime("%A")
            for (dn, subj), count in subject_per_day.items():
                if dn == day_name:
                    subject_total[subj] = subject_total.get(subj, 0) + count
            current_date += timedelta(days=1)

    # Count attended per subject
    subject_attended = {}
    if tt and tt.start_date:
        sd = datetime.combine(tt.start_date, datetime.min.time())
        ed = datetime.combine(today, datetime.max.time())
        records = db.query(Attendance.subject, func.count(Attendance.id)).filter(
            Attendance.student_id == student.id,
            Attendance.timestamp >= sd,
            Attendance.timestamp <= ed,
            Attendance.subject.isnot(None),
        ).group_by(Attendance.subject).all()
        for subj, count in records:
            subject_attended[str(subj).strip()] = count

    # Build result
    all_subjects = set(list(subject_total.keys()) + list(subject_attended.keys()))
    result = []
    for subj in sorted(all_subjects):
        total = subject_total.get(subj, 0)
        attended = subject_attended.get(subj, 0)
        pct = round((attended / total) * 100, 1) if total > 0 else 0
        result.append({
            "subject": subj,
            "attended": attended,
            "total": total,
            "percentage": pct,
            "status": "shortage" if pct < 75 else "safe",
        })

    result.sort(key=lambda x: x["percentage"])
    return {"subjects": result}


@router.get("/timetable")
def get_student_timetable(
    current: dict = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Get student's weekly timetable."""
    student = current["student"]

    tt = db.query(Timetable).filter(
        Timetable.branch == (student.branch.upper() if student.branch else ""),
        Timetable.student_class == (student.student_class.upper() if student.student_class else ""),
    ).first()

    if not tt:
        return {"schedule": None, "message": "No timetable found for your class"}

    schedule_data = None
    if tt.schedule_data:
        try:
            schedule_data = json.loads(tt.schedule_data) if isinstance(tt.schedule_data, str) else tt.schedule_data
        except (json.JSONDecodeError, TypeError):
            pass

    return {
        "branch": student.branch,
        "student_class": student.student_class,
        "schedule": schedule_data,
        "start_date": tt.start_date.isoformat() if tt.start_date else None,
    }


@router.get("/notifications")
def get_student_notifications(
    current: dict = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Get recent attendance notifications and alerts for the student."""
    student = current["student"]
    today = date.today()

    # Recent attendance confirmations (last 7 days)
    week_ago = datetime.combine(today - timedelta(days=7), datetime.min.time())
    recent_records = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.timestamp >= week_ago,
    ).order_by(Attendance.timestamp.desc()).all()

    notifications = []
    for r in recent_records:
        notifications.append({
            "type": "attendance",
            "message": f"Attendance marked for {r.subject or 'class'} ({r.time_slot or ''})",
            "timestamp": r.timestamp.isoformat(),
            "subject": r.subject,
        })

    # Low attendance alerts (subject-wise)
    from app.utils.timetable_parser import count_total_classes
    from app.utils.sms_service import calculate_shortage

    tt = db.query(Timetable).filter(
        Timetable.branch == (student.branch.upper() if student.branch else ""),
        Timetable.student_class == (student.student_class.upper() if student.student_class else ""),
    ).first()

    if tt and tt.schedule_data and tt.start_date:
        total_classes = count_total_classes(tt.schedule_data, tt.start_date, today)
        sd = datetime.combine(tt.start_date, datetime.min.time())
        ed = datetime.combine(today, datetime.max.time())
        attended = db.query(Attendance).filter(
            Attendance.student_id == student.id,
            Attendance.timestamp >= sd,
            Attendance.timestamp <= ed,
            Attendance.time_slot.isnot(None),
        ).count()
        shortage = calculate_shortage(attended, total_classes)

        if shortage["status"] == "shortage":
            notifications.insert(0, {
                "type": "warning",
                "message": shortage["message"],
                "timestamp": datetime.now().isoformat(),
                "subject": None,
            })
        elif shortage["percentage"] < 80:
            notifications.insert(0, {
                "type": "caution",
                "message": f"Your attendance is {shortage['percentage']}%. You need {shortage['classes_needed']} more classes to reach safe zone.",
                "timestamp": datetime.now().isoformat(),
                "subject": None,
            })

    return {"notifications": notifications}
