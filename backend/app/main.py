from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.core import database
from app.models.user import User
from app.models.student import Student
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.verification_attempt import VerificationAttempt
from app.models.timetable import Timetable

# Create Tables
database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS config
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Attendance System API"}

# Start notification scheduler (before-class SMS reminders)
try:
    from app.utils.notification_scheduler import start_notification_scheduler
    start_notification_scheduler()
except Exception as e:
    print(f"Failed to start notification scheduler: {e}")

# Import and include routers here later
from app.api.v1 import auth, students, verify, attendance, dashboard, model, timetable
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(students.router, prefix=f"{settings.API_V1_STR}/students", tags=["students"])
app.include_router(verify.router, prefix=f"{settings.API_V1_STR}/verify", tags=["verify"])
app.include_router(attendance.router, prefix=f"{settings.API_V1_STR}/attendance", tags=["attendance"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(model.router, prefix=f"{settings.API_V1_STR}/model", tags=["model"])
app.include_router(timetable.router, prefix=f"{settings.API_V1_STR}/timetable", tags=["timetable"])
