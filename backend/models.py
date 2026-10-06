from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    village = Column(String, nullable=True)
    preferred_language = Column(String, default="English")
    profile_photo = Column(String, nullable=True)
    auth_provider = Column(String, default="local")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    farm_id = Column(String, index=True, nullable=True)
    message = Column(String)
    intent = Column(String)
    response = Column(String)
    sources = Column(String) # Stored as JSON string or comma separated
    language = Column(String, default="English")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class FarmPlan(Base):
    __tablename__ = "farm_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    name = Column(String)
    crop = Column(String)
    area = Column(Float)
    soil_ph = Column(Float)
    nitrogen = Column(Float)
    phosphorus = Column(Float)
    potassium = Column(Float)
    expected_yield = Column(Float)
    crop_health = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
