from sqlalchemy import Column, Integer, String, Boolean
from app.core.database import Base

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value_bool = Column(Boolean, nullable=True)
    value_string = Column(String, nullable=True)
