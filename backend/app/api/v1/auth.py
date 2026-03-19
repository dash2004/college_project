from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Any

from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User, UserRole
from app.schemas.auth import UserCreate, UserResponse, Token, UserLogin, ChangePasswordRequest

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)) -> Any:
    # Check if user exists
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    # Create new user
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=security.get_password_hash(user_in.password),
        role=user_in.role,
        must_change_password=False  # Admin-created users via register don't need forced change
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)) -> Any:
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not security.verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=400, detail="Incorrect email or password"
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        subject=user.email, role=user.role, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "must_change_password": user.must_change_password,
    }

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)) -> Any:
    return current_user

@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not security.verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    current_user.password_hash = security.get_password_hash(req.new_password)
    current_user.must_change_password = False
    db.commit()
    return {"message": "Password changed successfully"}

