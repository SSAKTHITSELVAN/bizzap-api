from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class AgenticProfile(Base):
    __tablename__ = "agentic_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # GST details (from GST API)
    gstin = Column(String(15), unique=True, nullable=False, index=True)
    legal_name = Column(String(255), nullable=True)
    trade_name = Column(String(255), nullable=True)
    business_type = Column(String(100), nullable=True)   # Private Limited, Proprietorship etc
    gst_status = Column(String(50), nullable=True)       # Active / Inactive
    registration_date = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    state = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    pincode = Column(String(10), nullable=True)
    nature_of_business = Column(JSON, nullable=True)     # list of business activities

    # AI-built profile from external links (Qwen3 extracted)
    product_categories = Column(JSON, nullable=True)     # ["Cotton Fabric", "T-Shirts"]
    capabilities = Column(JSON, nullable=True)           # specifications, capacity, certifications
    pricing_bands = Column(JSON, nullable=True)          # {product: {min, max, unit}}
    min_order_quantities = Column(JSON, nullable=True)   # {product: moq}
    max_order_quantities = Column(JSON, nullable=True)
    serviceable_locations = Column(JSON, nullable=True)  # ["Tamil Nadu", "Karnataka"]
    standard_lead_times = Column(JSON, nullable=True)    # {product: days}
    payment_terms = Column(JSON, nullable=True)          # ["Advance", "Net 15", "Net 30"]
    certifications = Column(JSON, nullable=True)         # ["ISO 9001", "BIS"]

    # Agent configuration (supplier side)
    agent_config = Column(JSON, nullable=True)           # price floors, negotiation style, escalation rules

    # Profile build status
    profile_build_status = Column(String(50), default="pending")  # pending | building | complete | failed
    profile_summary = Column(Text, nullable=True)        # AI-generated business summary

    # Role derived from profile
    is_buyer = Column(Boolean, default=True)
    is_supplier = Column(Boolean, default=False)

    # Reliability score (updated post-deal ratings)
    reliability_score = Column(Integer, default=50)      # 0-100

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="profile")
