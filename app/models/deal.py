from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), unique=True, nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Order details
    product = Column(String(255), nullable=False)
    quantity = Column(Float, nullable=False)
    quantity_unit = Column(String(50), nullable=True)
    final_price_per_unit = Column(Float, nullable=False)
    total_value = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")

    # Terms
    lead_time_days = Column(Integer, nullable=True)
    payment_terms = Column(String(100), nullable=True)
    delivery_location = Column(String(255), nullable=True)
    special_conditions = Column(JSON, nullable=True)

    # Status: confirmed | fulfilled | cancelled | disputed
    status = Column(String(50), default="confirmed")

    # Savings/gains
    buyer_savings = Column(Float, nullable=True)         # vs target price
    supplier_gain = Column(Float, nullable=True)         # vs floor price

    # Rating
    buyer_rated_at = Column(DateTime, nullable=True)
    supplier_rated_at = Column(DateTime, nullable=True)
    buyer_rating = Column(Integer, nullable=True)
    supplier_rating = Column(Integer, nullable=True)

    confirmed_at = Column(DateTime, default=datetime.utcnow)
    fulfilled_at = Column(DateTime, nullable=True)

    # Relationships
    lead = relationship("Lead", foreign_keys=[lead_id])
    buyer = relationship("User", foreign_keys=[buyer_id])
    supplier = relationship("User", foreign_keys=[supplier_id])
