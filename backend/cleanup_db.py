from app.core.database import SessionLocal
from app.models.student import Student
from app.models.user import User

db = SessionLocal()

print("--- Cleaning Database ---")
student_id = "22005"
user_email = "bsdhanush57@gmail.com"

# Delete Student
student = db.query(Student).filter(Student.id == student_id).first()
if student:
    db.delete(student)
    print(f"Deleted Student: {student_id}")
else:
    print(f"Student {student_id} not found.")

# Delete User
user = db.query(User).filter(User.email == user_email).first()
if user:
    db.delete(user)
    print(f"Deleted User: {user_email}")
else:
    print(f"User {user_email} not found.")

db.commit()
db.close()
print("--- Cleanup Complete ---")
