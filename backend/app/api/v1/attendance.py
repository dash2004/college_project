from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date

from app.core.database import get_db
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.timetable import Timetable
from app.schemas.attendance import AttendanceResponse
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/logs", response_model=List[AttendanceResponse])
def get_attendance_logs(
    skip: int = 0, 
    limit: int = 100, 
    student_id: str = None,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    # Join with Student table to get names
    results = db.query(Attendance, Student.name).join(Student, Attendance.student_id == Student.id)
    
    if student_id:
        results = results.filter(Attendance.student_id == student_id)
        
    logs = results.order_by(Attendance.timestamp.desc()).offset(skip).limit(limit).all()
    
    response = []
    for log, name in logs:
        response.append({
            "id": log.id,
            "student_id": log.student_id,
            "student_name": name,
            "timestamp": log.timestamp,
            "confidence": log.confidence,
            "liveness_passed": log.liveness_passed,
            "photo_url": log.photo_url,
            "subject": log.subject,
            "time_slot": log.time_slot,
        })
        
    return response

@router.get("/student/{student_id}", response_model=List[AttendanceResponse])
def get_student_attendance(
    student_id: str,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    results = db.query(Attendance, Student.name).join(Student, Attendance.student_id == Student.id).filter(Attendance.student_id == student_id).order_by(Attendance.timestamp.desc()).all()
    
    response = []
    for log, name in results:
        response.append({
            "id": log.id,
            "student_id": log.student_id,
            "student_name": name,
            "timestamp": log.timestamp,
            "confidence": log.confidence,
            "liveness_passed": log.liveness_passed,
            "photo_url": log.photo_url,
            "subject": log.subject,
            "time_slot": log.time_slot,
        })
    return response


@router.get("/percentage")
def get_attendance_percentage(
    branch: Optional[str] = Query(None),
    student_class: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get attendance percentage for all students (or filtered by branch/class).
    Calculates from the timetable's start_date to today.
    Includes shortage info: how many classes needed to reach 80%.
    """
    from app.utils.timetable_parser import count_total_classes
    from app.utils.sms_service import calculate_shortage

    # Get students
    query = db.query(Student)
    if branch:
        query = query.filter(Student.branch == branch.upper())
    if student_class:
        query = query.filter(Student.student_class == student_class.upper())
    
    students = query.all()
    
    # Cache timetable lookups by (branch, class)
    tt_cache = {}
    today = date.today()
    
    result = []
    for student in students:
        key = (student.branch.upper() if student.branch else "", 
               student.student_class.upper() if student.student_class else "")
        
        # Get timetable (cached)
        if key not in tt_cache:
            tt = db.query(Timetable).filter(
                Timetable.branch == key[0],
                Timetable.student_class == key[1]
            ).first()
            tt_cache[key] = tt
        
        tt = tt_cache[key]
        
        total_classes = 0
        attended_classes = 0
        
        if tt and tt.schedule_data and tt.start_date:
            total_classes = count_total_classes(tt.schedule_data, tt.start_date, today)
            
            # Count attendance records with time_slot since start_date
            sd = datetime.combine(tt.start_date, datetime.min.time())
            attended_classes = db.query(Attendance).filter(
                Attendance.student_id == student.id,
                Attendance.timestamp >= sd,
                Attendance.time_slot.isnot(None)
            ).count()
        
        shortage = calculate_shortage(attended_classes, total_classes)
        
        result.append({
            "student_id": student.id,
            "name": student.name,
            "branch": student.branch,
            "student_class": student.student_class,
            "phone_number": student.phone_number,
            "attended_classes": attended_classes,
            "total_classes": total_classes,
            "percentage": shortage["percentage"],
            "status": shortage["status"],
            "classes_needed": shortage["classes_needed"],
            "can_skip": shortage.get("can_skip", 0),
            "message": shortage["message"],
        })
    
    # Sort: shortage students first, then by percentage ascending
    result.sort(key=lambda x: (0 if x["status"] == "shortage" else 1, x["percentage"]))
    
    return result

