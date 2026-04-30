"""General AI chat per requirement — buyer can query summaries, top sellers, etc."""
from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class RequirementChat(Base):
    __tablename__ = "requirement_chats"

    id = Column(Integer, primary_key=True, index=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id"), unique=True, nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Full conversation history [{role, content}]
    messages = Column(JSON, nullable=True, default=list)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    requirement = relationship("Requirement", foreign_keys=[requirement_id])
    buyer = relationship("User", foreign_keys=[buyer_id])
