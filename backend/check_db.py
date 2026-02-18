from app.core.database import SessionLocal
from app.models.student import Student
from app.models.user import User

db = SessionLocal()

print("--- Checking Database ---")
student = db.query(Student).filter(Student.id == "22005").first()
if student:
    print(f"Student found: {student.id}, Name: {student.name}")
else:
    print("Student '22005' NOT found.")

user_email = "bsdhanush57@gmail.com" # From user screenshot/logs
user = db.query(User).filter(User.email == user_email).first()
if user:
    print(f"User found: {user.id}, Email: {user.email}")
else:
    print(f"User '{user_email}' NOT found.")
    
db.close()
