from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db.base import Base


class MessageRole(str, enum.Enum):
    AI_BUYER = "ai_buyer"
    AI_SUPPLIER = "ai_supplier"
    HUMAN_BUYER = "human_buyer"
    HUMAN_SUPPLIER = "human_supplier"
    SYSTEM = "system"


class MessageType(str, enum.Enum):
    TEXT = "text"
    OFFER = "offer"
    COUNTER_OFFER = "counter_offer"
    CLARIFICATION = "clarification"
    DEAL_ACCEPTED = "deal_accepted"
    DEAL_DECLINED = "deal_declined"
    SYSTEM_EVENT = "system_event"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), unique=True, nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    mode = Column(String(50), default="ai_negotiating")
    ai_context = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Explicit foreign_keys on every relationship pointing to User
    lead = relationship("Lead", back_populates="conversation")
    buyer = relationship("User", foreign_keys=[buyer_id])
    supplier = relationship("User", foreign_keys=[supplier_id])
    messages = relationship(
        "Message", back_populates="conversation", order_by="Message.created_at"
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer, ForeignKey("conversations.id"), nullable=False, index=True
    )

    role = Column(String(50), nullable=False)
    message_type = Column(String(50), default="text")
    content = Column(Text, nullable=False)
    structured_data = Column(JSON, nullable=True)

    is_visible_to_buyer = Column(Boolean, default=True)
    is_visible_to_supplier = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
