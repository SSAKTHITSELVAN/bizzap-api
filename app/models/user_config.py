from sqlalchemy import Column, Integer, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class UserConfig(Base):
    """
    Stores user's editable plain-text/markdown config for:
    - Agentic profile (company info, products, capabilities)
    - Buyer AI settings (how the buyer agent negotiates)
    - Seller AI settings (how the seller agent negotiates)

    All three fields are freeform markdown/text that the user
    edits directly — no schema enforcement.
    The AI agents read these verbatim as system prompt context.
    """
    __tablename__ = "user_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # Editable company profile — extracted from links + GST, user can edit freely
    profile_md = Column(Text, nullable=True, default="")

    # Buyer AI configuration — instructions for how to negotiate when buying
    buyer_settings_md = Column(Text, nullable=True, default="")

    # Seller AI configuration — instructions for how to negotiate when selling
    seller_settings_md = Column(Text, nullable=True, default="")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
