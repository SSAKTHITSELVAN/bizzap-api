from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)


    # Core mandatory fields
    product = Column(String(255), nullable=False)
    quantity = Column(Float, nullable=False)
    quantity_unit = Column(String(50), nullable=True)    # kg, pieces, meters, liters
    budget_min = Column(Float, nullable=True)
    budget_max = Column(Float, nullable=False)
    budget_unit = Column(String(20), default="INR")

    # Additional enriched fields (collected by AI follow-up)
    specifications = Column(JSON, nullable=True)         # {material, gsm, color, sizes, grade}
    delivery_location = Column(String(255), nullable=True)
    delivery_days = Column(Integer, nullable=True)
    order_type = Column(String(50), nullable=True)       # one-time | recurring
    packaging = Column(String(100), nullable=True)
    certifications_required = Column(JSON, nullable=True)
    additional_notes = Column(Text, nullable=True)

    # AI enrichment tracking
    raw_prompt = Column(Text, nullable=False)            # original user message
    enrichment_status = Column(String(50), default="capturing")
    # capturing | enriching | confirmed | matching | matched | closed

    enrichment_conversation = Column(JSON, nullable=True)  # list of {role, content}
    structured_json = Column(JSON, nullable=True)          # final validated requirement object

    # Matching result
    matched_supplier_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)      # user-set expiry
    is_expired = Column(Boolean, default=False)

    # Relationships
    buyer = relationship("User", back_populates="requirements")
    leads = relationship("Lead", back_populates="requirement")
