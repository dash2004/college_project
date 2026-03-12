import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.system_setting import SystemSetting

router = APIRouter()

class SettingUpdate(BaseModel):
    value: bool

@router.get("/notifications-paused")
def get_notifications_paused(db: Session = Depends(get_db)):
    """Fetch the current global notification pause state."""
    setting = db.query(SystemSetting).filter(SystemSetting.key == "notifications_paused").first()
    
    if not setting:
        # Default is False (notifications are active) if not set.
        return {"paused": False}
        
    return {"paused": setting.value_bool}


@router.post("/notifications-paused")
def toggle_notifications_paused(update: SettingUpdate, db: Session = Depends(get_db)):
    """Toggle the global notification pause state."""
    setting = db.query(SystemSetting).filter(SystemSetting.key == "notifications_paused").first()
    
    if not setting:
        setting = SystemSetting(key="notifications_paused", value_bool=update.value)
        db.add(setting)
    else:
        setting.value_bool = update.value
        
    db.commit()
    return {"paused": setting.value_bool}
