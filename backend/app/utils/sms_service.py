"""
Fast2SMS integration for sending attendance notifications.

Setup:
  1. Register at https://www.fast2sms.com/
  2. Get your API key from the dashboard
  3. Set FAST2SMS_API_KEY in config or .env
  4. Set SMS_ENABLED=True
"""

import requests
from typing import Optional
from math import ceil
from app.core.config import settings


def send_sms(phone_number: str, message: str) -> dict:
    """
    Send SMS via Fast2SMS API.
    
    Args:
        phone_number: 10-digit Indian mobile number (no country code)
        message: SMS text content
    
    Returns:
        {"success": True/False, "message": "..."}
    """
    if not settings.SMS_ENABLED or not settings.FAST2SMS_API_KEY:
        print(f"[SMS-LOG] To {phone_number}: {message}")
        return {"success": True, "message": "SMS logged (not sent - SMS disabled)"}
    
    # Clean phone number — remove +91, spaces, etc.
    clean_number = phone_number.strip().replace(" ", "").replace("-", "")
    if clean_number.startswith("+91"):
        clean_number = clean_number[3:]
    elif clean_number.startswith("91") and len(clean_number) == 12:
        clean_number = clean_number[2:]
    
    if len(clean_number) != 10 or not clean_number.isdigit():
        return {"success": False, "message": f"Invalid phone number: {phone_number}"}
    
    try:
        url = "https://www.fast2sms.com/dev/bulkV2"
        headers = {
            "authorization": settings.FAST2SMS_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "route": "q",  # Quick SMS route
            "message": message,
            "language": "english",
            "flash": 0,
            "numbers": clean_number
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        data = response.json()
        
        if data.get("return"):
            print(f"[SMS-SENT] To {clean_number}: {message[:50]}...")
            return {"success": True, "message": "SMS sent successfully"}
        else:
            print(f"[SMS-FAIL] To {clean_number}: {data.get('message', 'Unknown error')}")
            return {"success": False, "message": data.get("message", "SMS send failed")}
    
    except Exception as e:
        print(f"[SMS-ERROR] {str(e)}")
        return {"success": False, "message": str(e)}


def calculate_shortage(attended: int, total: int, required_pct: float = 80.0) -> dict:
    """
    Calculate attendance shortage and how many more classes needed.
    
    Formula: (attended + N) / (total + N) >= required_pct/100
    Solving: N = ceil((required_pct/100 * total - attended) / (1 - required_pct/100))
    
    Returns:
        {
            "percentage": 76.4,
            "status": "shortage" | "safe" | "no_data",
            "classes_needed": 8,
            "message": "..."
        }
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
        # How many classes can they skip and still stay at required_pct?
        can_skip = 0
        if required_ratio < 1.0:
            can_skip = int((attended - required_ratio * total) / required_ratio)
        return {
            "percentage": percentage,
            "status": "safe",
            "classes_needed": 0,
            "can_skip": max(can_skip, 0),
            "message": f"✅ Safe! You can skip {max(can_skip, 0)} more classes"
        }
    else:
        # How many consecutive classes must they attend?
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
            "message": f"⚠️ Attend {classes_needed} more consecutive classes to reach {required_pct}%"
        }


def send_attendance_warning(phone_number: str, name: str, percentage: float, classes_needed: int) -> dict:
    """Send attendance shortage warning SMS."""
    message = (
        f"Smart Attendance Alert\n"
        f"Hi {name}, your attendance is {percentage}% (below 80%).\n"
        f"You need to attend {classes_needed} more consecutive classes to reach 80%.\n"
        f"Please attend all upcoming classes!"
    )
    return send_sms(phone_number, message)


def send_before_class_reminder(phone_number: str, name: str, subject: str, time_slot: str, minutes_until: int) -> dict:
    """Send before-class reminder SMS."""
    message = (
        f"Class Reminder\n"
        f"Hi {name}, your {subject} class starts in {minutes_until} minutes ({time_slot}).\n"
        f"Please be on time!"
    )
    return send_sms(phone_number, message)


def send_after_class_update(phone_number: str, name: str, subject: str, percentage: float, classes_needed: int) -> dict:
    """Send post-attendance percentage update SMS."""
    if percentage >= 80.0:
        message = (
            f"Attendance Marked!\n"
            f"Hi {name}, {subject} attendance recorded.\n"
            f"Your attendance: {percentage}% ✅ (Safe)"
        )
    else:
        message = (
            f"Attendance Marked!\n"
            f"Hi {name}, {subject} attendance recorded.\n"
            f"Your attendance: {percentage}% ⚠️\n"
            f"Need {classes_needed} more classes for 80%."
        )
    return send_sms(phone_number, message)
