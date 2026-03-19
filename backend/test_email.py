import os
import sys
from dotenv import load_dotenv

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.utils.email_service import send_before_class_reminder_email, send_attendance_warning_email, send_end_of_day_report_email
from app.core.config import settings

def test_emails():
    # Load .env file
    load_dotenv()
    
    # Check if email is configured
    if not settings.EMAIL_ENABLED:
        print("Warning: EMAIL_ENABLED is False or missing in configuration.")
        
    TEST_EMAIL = os.getenv("TEST_EMAIL", "kapidhwajsm@gmail.com")
    
    print(f"Testing Email messaging to: {TEST_EMAIL}")
    print(f"Using SMTP Server: {settings.SMTP_SERVER}")
    print("-" * 50)
    
    print("1. Sending Before Class Reminder...")
    res1 = send_before_class_reminder_email(
        to_email=TEST_EMAIL,
        name="Test Student",
        subject_name="Mathematics",
        time_slot="09:00 AM - 10:00 AM",
        minutes_until=10
    )
    print(f"Result: {res1}")
    print("-" * 50)
    
    print("2. Sending Attendance Warning...")
    res2 = send_attendance_warning_email(
        to_email=TEST_EMAIL,
        name="Test Student",
        percentage=72.5,
        classes_needed=4
    )
    print(f"Result: {res2}")
    print("-" * 50)
    
    print("3. Sending End of Day Report...")
    res3 = send_end_of_day_report_email(
        to_email=TEST_EMAIL,
        name="Test Student",
        student_class="CSE-A",
        percentage=85.0,
        classes_needed=0,
        status="safe",
        can_skip=2
    )
    print(f"Result: {res3}")
    print("-" * 50)

if __name__ == "__main__":
    test_emails()
