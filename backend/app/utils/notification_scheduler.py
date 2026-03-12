"""
Background notification scheduler for before-class reminders.
Checks timetable every 5 minutes and sends SMS reminders
to students whose class starts within BEFORE_CLASS_REMINDER_MINUTES.
"""

import threading
import time
from datetime import datetime
from typing import Set


# Track which reminders have already been sent today (to avoid duplicates)
_sent_reminders: Set[str] = set()
_last_reset_date = None
_scheduler_thread = None


def _reset_if_new_day():
    """Clear sent reminders at the start of each new day."""
    global _last_reset_date, _sent_reminders
    today = datetime.now().date()
    if _last_reset_date != today:
        _sent_reminders.clear()
        _last_reset_date = today


def _check_and_send_reminders():
    """Check timetable and send reminders for upcoming classes."""
    from app.core.database import SessionLocal
    from app.models.student import Student
    from app.models.user import User
    from app.models.timetable import Timetable
    from app.models.attendance import Attendance
    from app.models.system_setting import SystemSetting
    from app.utils.timetable_parser import get_upcoming_class, count_total_classes
    from app.utils.email_service import send_before_class_reminder_email, send_attendance_warning_email, calculate_shortage, send_end_of_day_report_email
    from app.core.config import settings
    
    _reset_if_new_day()
    
    db = SessionLocal()
    try:
        # Check global pause state
        global_pause = db.query(SystemSetting).filter(SystemSetting.key == "notifications_paused").first()
        if global_pause and global_pause.value_bool:
            print("[SCHEDULER] Notifications are globally paused.")
            return

        now = datetime.now()
        
        # Get all timetables with notifications enabled
        timetables = db.query(Timetable).filter(
            Timetable.notifications_enabled == True,
            Timetable.schedule_data.isnot(None)
        ).all()
        
        for tt in timetables:
            # Check if there's a class coming up within the reminder window
            upcoming = get_upcoming_class(
                tt.schedule_data, now, 
                lookahead_minutes=settings.BEFORE_CLASS_REMINDER_MINUTES
            )
            
            if not upcoming:
                continue
            
            # Get all students and their emails in this branch/class
            students = db.query(Student, User.email).join(User, Student.user_id == User.id).filter(
                Student.branch == tt.branch,
                Student.student_class == tt.student_class,
                User.email.isnot(None)
            ).all()
            
            for student, student_email in students:
                # Unique key to avoid duplicate reminders
                reminder_key = f"{student.id}_{upcoming['time_slot']}_{now.date()}"
                if reminder_key in _sent_reminders:
                    continue
                
                # 1. Send before-class reminder
                send_before_class_reminder_email(
                    student_email,
                    student.name,
                    upcoming["subject"],
                    upcoming["time_slot"],
                    upcoming["minutes_until"]
                )
                
                # 2. Also check if student has attendance shortage and warn
                if tt.start_date:
                    from datetime import date
                    total = count_total_classes(tt.schedule_data, tt.start_date, date.today())
                    
                    sd = datetime.combine(tt.start_date, datetime.min.time())
                    attended = db.query(Attendance).filter(
                        Attendance.student_id == student.id,
                        Attendance.timestamp >= sd,
                        Attendance.time_slot.isnot(None)
                    ).count()
                    
                    shortage = calculate_shortage(attended, total, settings.ATTENDANCE_MIN_PERCENTAGE)
                    
                    if shortage["status"] == "shortage":
                        shortage_key = f"shortage_{student.id}_{now.date()}"
                        if shortage_key not in _sent_reminders:
                            send_attendance_warning_email(
                                student_email,
                                student.name,
                                shortage["percentage"],
                                shortage["classes_needed"]
                            )
                            _sent_reminders.add(shortage_key)
                
                _sent_reminders.add(reminder_key)
        
    except Exception as e:
        print(f"[SCHEDULER-ERROR] {str(e)}")
    finally:
        db.close()

def _check_and_send_end_of_day_reports():
    """Check if it's the end of day report time and send reports."""
    from app.core.database import SessionLocal
    from app.models.student import Student
    from app.models.user import User
    from app.models.timetable import Timetable
    from app.models.attendance import Attendance
    from app.models.system_setting import SystemSetting
    from app.utils.timetable_parser import count_total_classes
    from app.utils.email_service import calculate_shortage, send_end_of_day_report_email
    from app.core.config import settings
    
    _reset_if_new_day()
    now = datetime.now()
    current_time_str = now.strftime("%H:%M")
    report_time_str = settings.END_OF_DAY_REPORT_TIME
    
    # Check if we should send it now based on hour/minute matches config string
    if current_time_str != report_time_str:
        return
        
    db = SessionLocal()
    try:
        # Check global pause state
        global_pause = db.query(SystemSetting).filter(SystemSetting.key == "notifications_paused").first()
        if global_pause and global_pause.value_bool:
            return
            
        # Get all timetables with notifications enabled
        timetables = db.query(Timetable).filter(
            Timetable.notifications_enabled == True,
            Timetable.schedule_data.isnot(None),
            Timetable.start_date.isnot(None)
        ).all()
        
        for tt in timetables:
            # Get all students and their emails in this branch/class
            students = db.query(Student, User.email).join(User, Student.user_id == User.id).filter(
                Student.branch == tt.branch,
                Student.student_class == tt.student_class,
                User.email.isnot(None)
            ).all()
            
            from datetime import date
            total = count_total_classes(tt.schedule_data, tt.start_date, date.today())
            sd = datetime.combine(tt.start_date, datetime.min.time())
            
            for student, student_email in students:
                report_key = f"eod_report_{student.id}_{now.date()}"
                if report_key in _sent_reminders:
                    continue
                    
                attended = db.query(Attendance).filter(
                    Attendance.student_id == student.id,
                    Attendance.timestamp >= sd,
                    Attendance.time_slot.isnot(None)
                ).count()
                
                shortage = calculate_shortage(attended, total, settings.ATTENDANCE_MIN_PERCENTAGE)
                
                send_end_of_day_report_email(
                    to_email=student_email,
                    name=student.name,
                    student_class=tt.student_class,
                    percentage=shortage["percentage"],
                    classes_needed=shortage["classes_needed"],
                    status=shortage["status"],
                    can_skip=shortage.get("can_skip", 0)
                )
                
                _sent_reminders.add(report_key)
                
    except Exception as e:
        print(f"[SCHEDULER-EOD-ERROR] {str(e)}")
    finally:
        db.close()


def _scheduler_loop():
    """Main scheduler loop — runs every 5 minutes."""
    print("[SCHEDULER] Before-class reminder scheduler started")
    while True:
        try:
            _check_and_send_reminders()
            _check_and_send_end_of_day_reports()
        except Exception as e:
            print(f"[SCHEDULER-ERROR] {str(e)}")
        time.sleep(300)  # Check every 5 minutes


def start_notification_scheduler():
    """Start the notification scheduler in a background thread."""
    global _scheduler_thread
    if _scheduler_thread is not None and _scheduler_thread.is_alive():
        print("[SCHEDULER] Already running")
        return
    
    _scheduler_thread = threading.Thread(target=_scheduler_loop, daemon=True)
    _scheduler_thread.start()
    print("[SCHEDULER] Background notification scheduler started")
