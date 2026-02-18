from app.core.database import SessionLocal
from app.models.attendance import Attendance
from app.models.student import Student

db = SessionLocal()

print("--- Checking Attendance Logs ---")
logs = db.query(Attendance).all()

if not logs:
    print("No attendance records found.")
else:
    print(f"Found {len(logs)} records:")
    for log in logs:
        student = db.query(Student).filter(Student.id == log.student_id).first()
        name = student.name if student else "Unknown"
        print(f"[{log.timestamp}] Student: {name} ({log.student_id}) - Conf: {log.confidence:.2f}")

db.close()
