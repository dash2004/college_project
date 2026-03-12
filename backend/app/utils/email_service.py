"""
Email integration for sending attendance notifications.

Setup:
  1. Have a valid email account (e.g. Gmail)
  2. If using Gmail, enable 2-Step Verification and generate an "App Password"
  3. Set SMTP_USERNAME, SMTP_PASSWORD, and SENDER_EMAIL in .env
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from math import ceil
from typing import Optional
from app.core.config import settings

def send_email(to_email: str, subject: str, message: str) -> dict:
    """
    Send an Email via SMTP.
    
    Args:
        to_email: Student's email address
        subject: Email subject
        message: Text content
        
    Returns:
        {"success": True/False, "message": "..."}
    """
    if not settings.EMAIL_ENABLED or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        print(f"[EMAIL-LOG] To {to_email}: [{subject}]\n{message}")
        return {"success": True, "message": "Email logged (not sent - Email disabled or missing credentials)"}
        
    try:
        msg = MIMEMultipart()
        msg['From'] = settings.SENDER_EMAIL or settings.SMTP_USERNAME
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(message, 'plain'))
        
        # Connect to SMTP server
        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        safe_message = message[:50].replace('\n', ' ')
        print(f"[EMAIL-SENT] To {to_email}: {safe_message}...")
        return {"success": True, "message": "Email sent successfully"}
    except Exception as e:
        print(f"[EMAIL-ERROR] Failed to send to {to_email}: {str(e)}")
        return {"success": False, "message": str(e)}

def calculate_shortage(attended: int, total: int, required_pct: float = 80.0) -> dict:
    """
    Calculate attendance shortage and how many more classes needed.
    """
    if total == 0:
        return {
            "percentage": 0.0,
            "status": "no_data",
            "classes_needed": 0,
            "message": "No classes scheduled yet"
        }
    
    percentage = round((attended / total) * 100, 1)
    required_ratio = required_pct / 100.0
    
    if percentage >= required_pct:
        can_skip = 0
        if required_ratio < 1.0:
            can_skip = int((attended - required_ratio * total) / required_ratio)
        return {
            "percentage": percentage,
            "status": "safe",
            "classes_needed": 0,
            "can_skip": max(can_skip, 0),
            "message": f"Safe! You can skip {max(can_skip, 0)} more classes"
        }
    else:
        deficit = required_ratio * total - attended
        denominator = 1.0 - required_ratio
        if denominator <= 0:
            classes_needed = 999
        else:
            classes_needed = ceil(deficit / denominator)
        
        return {
            "percentage": percentage,
            "status": "shortage",
            "classes_needed": classes_needed,
            "can_skip": 0,
            "message": f"Attend {classes_needed} more consecutive classes to reach {required_pct}%"
        }

def send_attendance_warning_email(to_email: str, name: str, percentage: float, classes_needed: int) -> dict:
    """Send attendance shortage warning Email."""
    subject = "Smart Attendance Alert: Low Attendance"
    message = (
        f"Hi {name},\n\n"
        f"Your attendance is currently {percentage}% (below 80%).\n"
        f"You need to attend {classes_needed} more consecutive classes to reach the minimum requirement.\n\n"
        f"Please ensure you attend all upcoming classes!"
    )
    return send_email(to_email, subject, message)

def send_before_class_reminder_email(to_email: str, name: str, subject_name: str, time_slot: str, minutes_until: int) -> dict:
    """Send before-class reminder Email."""
    subject = f"Class Reminder: {subject_name} starting soon"
    message = (
        f"Hi {name},\n\n"
        f"Your {subject_name} class starts in {minutes_until} minutes ({time_slot}).\n"
        f"Please be on time for live attendance verification!"
    )
    return send_email(to_email, subject, message)

def send_after_class_update_email(to_email: str, name: str, subject_name: str, percentage: float, classes_needed: int) -> dict:
    """Send post-attendance percentage update Email."""
    subject = f"Attendance Marked: {subject_name}"
    
    if percentage >= 80.0:
        message = (
            f"Hi {name},\n\n"
            f"{subject_name} attendance recorded successfully.\n"
            f"Your overall attendance: {percentage}% (Safe status)"
        )
    else:
        message = (
            f"Hi {name},\n\n"
            f"{subject_name} attendance recorded.\n"
            f"Your overall attendance: {percentage}%\n"
            f"Note: You still need {classes_needed} more consecutive classes to reach 80%."
        )
    return send_email(to_email, subject, message)

def send_end_of_day_report_email(to_email: str, name: str, student_class: str, percentage: float, classes_needed: int, status: str, can_skip: int) -> dict:
    """Send end of day summary report to the student."""
    subject = "Smart Attendance System: Daily Attendance Report"
    
    greeting = f"Hi {name},\n\nHere is your end-of-day attendance report for Class {student_class}.\n\n"
    stats = f"Current Overall Attendance: {percentage}%\n"
    
    if status == "safe":
        suggestion = f"Status: Safe ✅\nYou can skip {can_skip} more classes before your attendance drops below the 80% minimum requirement."
    elif status == "no_data":
        suggestion = f"Status: No Data ℹ️\n{classes_needed} classes scheduled so far."
    else:
        suggestion = f"Status: Shortage ⚠️\nYou need to attend {classes_needed} more consecutive classes to reach the 80% minimum requirement."
        
    closing = "\n\nRegards,\nSmart Attendance System"
    
    message = greeting + stats + suggestion + closing
    return send_email(to_email, subject, message)
