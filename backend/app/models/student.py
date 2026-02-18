from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True, index=True) # "22005"
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    branch = Column(String)
    student_class = Column(String, name="class") # "class" is reserved keyword
    semester = Column(Integer)
    phone_number = Column(String, nullable=True)  # For SMS notifications
    face_image_path = Column(String) # Path to the main face folder
    created_at = Column(DateTime, default=datetime.utcnow)

    # user = relationship("User", back_populates="student_profile")
