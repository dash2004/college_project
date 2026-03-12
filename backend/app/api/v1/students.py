from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Any, Optional
import os
import base64

from app.core.dependencies import get_db, get_current_user, get_current_admin
from app.core import security
from app.models.student import Student
from app.models.user import User
from app.schemas.student import StudentResponse, StudentUpdate, StudentCreate

router = APIRouter()

@router.get("/list", response_model=List[StudentResponse])
def list_students(
    skip: int = 0, 
    limit: int = 100,
    branch: Optional[str] = None,
    student_class: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # Teachers and Admins can view all list
    if current_user.role == 'student':
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Join with User to get email
    query = db.query(Student, User.email).join(User, Student.user_id == User.id)
    
    if branch:
        query = query.filter(Student.branch == branch)
    if student_class:
        query = query.filter(Student.student_class == student_class)
        
    results = query.offset(skip).limit(limit).all()
    
    students_data = []
    for student, email in results:
        students_data.append({
            "student_id": student.id,
            "name": student.name,
            "email": email,
            "branch": student.branch,
            "student_class": student.student_class,
            "semester": student.semester,
            "phone_number": student.phone_number,
            "face_image_path": student.face_image_path
        })
        
    return students_data

@router.post("/register", response_model=StudentResponse)
def register_student(
    student_in: StudentCreate,
    db: Session = Depends(get_db)
) -> Any:
    # 1. Check if user with email already exists
    user = db.query(User).filter(User.email == student_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Check if student ID exists
    student = db.query(Student).filter(Student.id == student_in.student_id).first()
    if student:
        raise HTTPException(status_code=400, detail="Student ID already exists")

    # 2. Save Images
    dataset_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "faces")
    student_folder_name = f"{student_in.student_id}_{student_in.name.replace(' ', '_')}"
    student_dir = os.path.join(dataset_dir, student_folder_name)
    os.makedirs(student_dir, exist_ok=True)
    
    for idx, img_payload in enumerate(student_in.images):
        try:
            img_data = base64.b64decode(img_payload.data)
            img_name = f"{img_payload.metadata.angle}_{idx}.jpg"
            img_path = os.path.join(student_dir, img_name)
            with open(img_path, "wb") as f:
                f.write(img_data)
        except Exception as e:
            print(f"Error saving image: {e}")
            
    # 3. Create User
    new_user = User(
        email=student_in.email,
        full_name=student_in.name,
        password_hash=security.get_password_hash(student_in.student_id), # Default password is student ID
        role="student"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 4. Create Student
    # face_image_path could be absolute or relative, using relative here
    rel_path = os.path.join("data", "faces", student_folder_name)
    
    new_student = Student(
        id=student_in.student_id,
        user_id=new_user.id,
        name=student_in.name,
        branch=student_in.branch,
        student_class=student_in.student_class,
        semester=student_in.semester,
        phone_number=student_in.phone_number,
        face_image_path=rel_path
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    return {
        "student_id": new_student.id,
        "name": new_student.name,
        "email": new_user.email,
        "branch": new_student.branch,
        "student_class": new_student.student_class,
        "semester": new_student.semester,
        "face_image_path": new_student.face_image_path
    }

@router.put("/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: str,
    student_in: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
) -> Any:
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Update Student fields
    if student_in.name:
        student.name = student_in.name
    if student_in.branch:
        student.branch = student_in.branch
    if student_in.student_class:
        student.student_class = student_in.student_class
    if student_in.semester:
        student.semester = student_in.semester
        
    # Update User fields if needed (e.g. email/name)
    user = db.query(User).filter(User.id == student.user_id).first()
    if user:
        if student_in.email:
             # Check for duplicate email
            existing_user = db.query(User).filter(User.email == student_in.email).first()
            if existing_user and existing_user.id != user.id:
                raise HTTPException(status_code=400, detail="Email already registered")
            user.email = student_in.email
        if student_in.name:
            user.full_name = student_in.name
            
    db.commit()
    db.refresh(student)
    
    return {
        "student_id": student.id,
        "name": student.name,
        "email": user.email if user else "",
        "branch": student.branch,
        "student_class": student.student_class,
        "semester": student.semester,
        "face_image_path": student.face_image_path
    }

@router.delete("/{student_id}")
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Delete associated User (Cascade should handle student, but let's be safe)
    user = db.query(User).filter(User.id == student.user_id).first()
    
    db.delete(student)
    if user:
        db.delete(user)
        
    db.commit()
    return {"message": "Student deleted successfully"}
