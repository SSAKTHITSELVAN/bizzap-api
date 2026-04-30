from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    requirement_id = Column(Integer, ForeignKey("requirements.id"), nullable=False, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Match scoring
    fit_score = Column(Float, nullable=True)             # 0-100
    match_reasons = Column(JSON, nullable=True)          # why this supplier was matched

    # Lead status lifecycle
    # new | agent_initiated | negotiating | offer_ready | buyer_review |
    # accepted | renegotiating | manual_chat | deal_closed | not_selected | declined
    status = Column(String(50), default="new")

    # Negotiation tracking
    current_offer_price = Column(Float, nullable=True)
    current_offer_unit = Column(String(50), nullable=True)
    current_lead_time = Column(Integer, nullable=True)   # days
    negotiation_round = Column(Integer, default=0)
    max_negotiation_rounds = Column(Integer, default=5)

    # Final deal details
    final_price = Column(Float, nullable=True)
    final_lead_time = Column(Integer, nullable=True)
    final_payment_terms = Column(String(100), nullable=True)
    deal_summary = Column(JSON, nullable=True)

    # Human takeover flags
    buyer_chat_enabled = Column(Boolean, default=False)    # buyer enabled manual chat
    supplier_chat_enabled = Column(Boolean, default=False)  # supplier enabled manual chat
    ai_paused_for_buyer = Column(Boolean, default=False)   # awaiting buyer input
    ai_paused_for_supplier = Column(Boolean, default=False)  # awaiting supplier input

    # Ratings
    buyer_rating = Column(Integer, nullable=True)          # 1-5
    supplier_rating = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deal_closed_at = Column(DateTime, nullable=True)

    # Relationships
    requirement = relationship("Requirement", back_populates="leads")
    buyer = relationship("User", foreign_keys=[buyer_id])
    supplier = relationship("User", foreign_keys=[supplier_id])
    conversation = relationship("Conversation", back_populates="lead", uselist=False)
