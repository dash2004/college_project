import os
import json
import shutil
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.timetable import Timetable
from app.schemas.timetable import TimetableResponse, CurrentClassInfo, TimetableToggleResponse
from app.utils.timetable_parser import parse_excel, get_current_class, get_upcoming_class

router = APIRouter()

UPLOAD_DIR = os.path.join("data", "timetables")
ALLOWED_EXTENSIONS = {"xlsx", "xls", "png", "jpg", "jpeg", "pdf"}
EXCEL_EXTENSIONS = {"xlsx", "xls"}


def _get_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


@router.post("/upload", response_model=TimetableResponse)
async def upload_timetable(
    branch: str = Form(...),
    student_class: str = Form(...),
    start_date: str = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a timetable file for a specific department + class."""
    ext = _get_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '.{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Check if timetable already exists for this branch+class
    existing = db.query(Timetable).filter(
        Timetable.branch == branch.upper(),
        Timetable.student_class == student_class.upper()
    ).first()

    if existing:
        # Delete old file
        if existing.file_path and os.path.exists(existing.file_path):
            os.remove(existing.file_path)
        db.delete(existing)
        db.commit()

    # Save file
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{branch.upper()}_{student_class.upper()}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Parse schedule if Excel
    schedule_data = None
    if ext in EXCEL_EXTENSIONS:
        try:
            schedule = parse_excel(file_path)
            schedule_data = json.dumps(schedule)
        except Exception as e:
            # Clean up uploaded file
            os.remove(file_path)
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse Excel file: {str(e)}"
            )

    # Parse start_date
    from datetime import date as _date
    parsed_start_date = None
    if start_date:
        try:
            parsed_start_date = _date.fromisoformat(start_date)
        except ValueError:
            parsed_start_date = _date.today()
    else:
        parsed_start_date = _date.today()

    # Create record
    timetable = Timetable(
        branch=branch.upper(),
        student_class=student_class.upper(),
        file_path=file_path,
        file_type=ext,
        schedule_data=schedule_data,
        notifications_enabled=True,
        start_date=parsed_start_date
    )
    db.add(timetable)
    db.commit()
    db.refresh(timetable)

    # Build response
    parsed_schedule = json.loads(schedule_data) if schedule_data else None
    return TimetableResponse(
        id=timetable.id,
        branch=timetable.branch,
        student_class=timetable.student_class,
        file_type=timetable.file_type,
        notifications_enabled=timetable.notifications_enabled,
        start_date=timetable.start_date,
        created_at=timetable.created_at,
        schedule_data=parsed_schedule
    )


@router.get("/list", response_model=list[TimetableResponse])
def list_timetables(
    branch: Optional[str] = None,
    student_class: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all timetables, optionally filtered by branch and/or class."""
    query = db.query(Timetable)
    if branch:
        query = query.filter(Timetable.branch == branch.upper())
    if student_class:
        query = query.filter(Timetable.student_class == student_class.upper())

    timetables = query.order_by(Timetable.created_at.desc()).all()

    results = []
    for t in timetables:
        parsed = json.loads(t.schedule_data) if t.schedule_data else None
        results.append(TimetableResponse(
            id=t.id,
            branch=t.branch,
            student_class=t.student_class,
            file_type=t.file_type,
            notifications_enabled=t.notifications_enabled,
            created_at=t.created_at,
            schedule_data=parsed
        ))
    return results


@router.get("/{timetable_id}", response_model=TimetableResponse)
def get_timetable(timetable_id: int, db: Session = Depends(get_db)):
    """Get a specific timetable with its parsed schedule."""
    t = db.query(Timetable).filter(Timetable.id == timetable_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Timetable not found")

    parsed = json.loads(t.schedule_data) if t.schedule_data else None
    return TimetableResponse(
        id=t.id,
        branch=t.branch,
        student_class=t.student_class,
        file_type=t.file_type,
        notifications_enabled=t.notifications_enabled,
        created_at=t.created_at,
        schedule_data=parsed
    )


@router.patch("/{timetable_id}/toggle", response_model=TimetableToggleResponse)
def toggle_notifications(timetable_id: int, db: Session = Depends(get_db)):
    """Toggle notifications on/off for a timetable."""
    t = db.query(Timetable).filter(Timetable.id == timetable_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Timetable not found")

    t.notifications_enabled = not t.notifications_enabled
    t.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(t)

    return TimetableToggleResponse(id=t.id, notifications_enabled=t.notifications_enabled)


@router.delete("/{timetable_id}")
def delete_timetable(timetable_id: int, db: Session = Depends(get_db)):
    """Delete a timetable and its uploaded file."""
    t = db.query(Timetable).filter(Timetable.id == timetable_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Timetable not found")

    # Delete file
    if t.file_path and os.path.exists(t.file_path):
        os.remove(t.file_path)

    db.delete(t)
    db.commit()
    return {"detail": "Timetable deleted successfully"}


@router.get("/current-class/{branch}/{student_class}", response_model=CurrentClassInfo)
def get_current_class_info(branch: str, student_class: str, db: Session = Depends(get_db)):
    """Get the current and upcoming class for a specific branch + class."""
    t = db.query(Timetable).filter(
        Timetable.branch == branch.upper(),
        Timetable.student_class == student_class.upper()
    ).first()

    if not t or not t.schedule_data or not t.notifications_enabled:
        return CurrentClassInfo()

    now = datetime.now()
    current = get_current_class(t.schedule_data, now)
    upcoming = get_upcoming_class(t.schedule_data, now, lookahead_minutes=10)

    return CurrentClassInfo(
        current_subject=current["subject"] if current else None,
        current_time_slot=current["time_slot"] if current else None,
        upcoming_subject=upcoming["subject"] if upcoming else None,
        upcoming_time_slot=upcoming["time_slot"] if upcoming else None,
        upcoming_in_minutes=upcoming["minutes_until"] if upcoming else None
    )
