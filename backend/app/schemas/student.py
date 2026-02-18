from pydantic import BaseModel
from typing import List, Optional

class StudentBase(BaseModel):
    student_id: str
    name: str
    email: str
    branch: str
    student_class: str
    semester: int
    phone_number: Optional[str] = None

class ImageMetadata(BaseModel):
    angle: str # front, left_45, right_45, up, down
    lighting: str = "normal"
    glasses: bool = False

class ImagePayload(BaseModel):
    data: str # Base64 string
    metadata: ImageMetadata

class StudentCreate(StudentBase):
    images: List[ImagePayload]

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    branch: Optional[str] = None
    student_class: Optional[str] = None
    semester: Optional[int] = None
    phone_number: Optional[str] = None

class StudentResponse(StudentBase):
    face_image_path: str

    class Config:
        from_attributes = True
