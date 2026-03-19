from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import Optional
import json
import qrcode
import io
import base64
import uuid

from app.core.database import get_db
from app.models.qr_token import QRToken
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.timetable import Timetable
from app.utils.timetable_parser import get_current_class

router = APIRouter()


@router.post("/generate")
def generate_qr(
    student_id: str,
    branch: Optional[str] = None,
    student_class: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Generate a single-use, time-limited QR code for attendance.
    Called by the kiosk when face recognition fails."""

    # Validate student exists
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Find current class from timetable
    b = branch or (student.branch.upper() if student.branch else "")
    c = student_class or (student.student_class.upper() if student.student_class else "")

    tt = db.query(Timetable).filter(
        Timetable.branch == b,
        Timetable.student_class == c,
    ).first()

    subject = None
    time_slot = None
    if tt and tt.schedule_data:
        now = datetime.now()
        current = get_current_class(tt.schedule_data, now)
        if current:
            subject = current["subject"]
            time_slot = current["time_slot"]

    if not time_slot:
        raise HTTPException(
            status_code=400,
            detail="No class is scheduled right now. QR attendance can only be generated during class hours."
        )

    # Check if attendance already logged for this slot today
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    existing = db.query(Attendance).filter(
        Attendance.student_id == student_id,
        Attendance.time_slot == time_slot,
        Attendance.timestamp >= today_start,
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Attendance already marked for {subject} ({time_slot})"
        )

    # Create QR token
    qr_token = QRToken.create_token(
        student_id=student_id,
        subject=subject,
        time_slot=time_slot,
        ttl_minutes=5,
    )
    db.add(qr_token)
    db.commit()

    # Generate QR code image
    # The URL the student scans — points to the verify endpoint
    verify_url = f"http://localhost:8000/api/v1/qr/verify/{qr_token.token}"

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(verify_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "qr_image": f"data:image/png;base64,{qr_base64}",
        "token": qr_token.token,
        "student_name": student.name,
        "subject": subject,
        "time_slot": time_slot,
        "expires_in_seconds": 300,
        "message": f"QR code generated for {student.name}. Scan within 5 minutes.",
    }


@router.get("/verify/{token}", response_class=HTMLResponse)
def verify_qr(token: str, db: Session = Depends(get_db)):
    """Student scans QR code — this verifies and marks attendance.
    Returns an HTML page with the result."""

    qr = db.query(QRToken).filter(QRToken.token == token).first()

    if not qr:
        return _html_response("Invalid QR Code", "This QR code is not valid.", "error")

    if qr.used:
        return _html_response("Already Used", "This QR code has already been scanned.", "warning")

    if datetime.utcnow() > qr.expires_at:
        return _html_response("Expired", "This QR code has expired. Please generate a new one.", "error")

    # Check if attendance already logged
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    existing = db.query(Attendance).filter(
        Attendance.student_id == qr.student_id,
        Attendance.time_slot == qr.time_slot,
        Attendance.timestamp >= today_start,
    ).first()

    if existing:
        qr.used = True
        db.commit()
        return _html_response(
            "Already Marked",
            f"Attendance was already marked for {qr.subject} ({qr.time_slot}).",
            "warning"
        )

    # Mark attendance
    student = db.query(Student).filter(Student.id == qr.student_id).first()
    attendance = Attendance(
        student_id=qr.student_id,
        confidence=1.0,
        liveness_passed=False,  # QR-based, not face
        subject=qr.subject,
        time_slot=qr.time_slot,
    )
    db.add(attendance)

    # Mark token as used
    qr.used = True
    db.commit()

    student_name = student.name if student else qr.student_id
    return _html_response(
        "Attendance Marked!",
        f"{student_name} — {qr.subject} ({qr.time_slot})",
        "success"
    )


def _html_response(title: str, message: str, status: str) -> str:
    """Generate a mobile-friendly HTML response page."""
    colors = {
        "success": {"bg": "#064e3b", "accent": "#10b981", "icon": "✅"},
        "error": {"bg": "#7f1d1d", "accent": "#ef4444", "icon": "❌"},
        "warning": {"bg": "#78350f", "accent": "#f59e0b", "icon": "⚠️"},
    }
    c = colors.get(status, colors["error"])

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title} - SecureID</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #0f172a;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                padding: 20px;
            }}
            .card {{
                background: #1e293b;
                border: 1px solid #334155;
                border-radius: 20px;
                padding: 40px 30px;
                max-width: 380px;
                width: 100%;
                text-align: center;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            }}
            .icon {{
                font-size: 48px;
                margin-bottom: 20px;
            }}
            .title {{
                color: {c['accent']};
                font-size: 24px;
                font-weight: 800;
                margin-bottom: 12px;
            }}
            .message {{
                color: #94a3b8;
                font-size: 14px;
                line-height: 1.6;
            }}
            .badge {{
                display: inline-block;
                background: {c['bg']};
                color: {c['accent']};
                padding: 6px 16px;
                border-radius: 50px;
                font-size: 12px;
                font-weight: 600;
                margin-top: 20px;
                border: 1px solid {c['accent']}33;
            }}
            .brand {{
                color: #334155;
                font-size: 11px;
                margin-top: 24px;
                letter-spacing: 2px;
                text-transform: uppercase;
            }}
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon">{c['icon']}</div>
            <div class="title">{title}</div>
            <div class="message">{message}</div>
            <div class="badge">SecureID Attendance</div>
            <div class="brand">Smart Attendance System</div>
        </div>
    </body>
    </html>
    """
