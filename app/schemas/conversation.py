from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class MessageOut(BaseModel):
    id: int
    role: str
    message_type: str
    content: str
    structured_data: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: int
    lead_id: int
    mode: str
    buyer_chat_enabled: bool
    supplier_chat_enabled: bool
    messages: List[MessageOut]
    created_at: datetime

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    conversation_id: int
    content: str


class SendMessageResponse(BaseModel):
    message: MessageOut
    ai_response: Optional[MessageOut] = None


class ToggleChatRequest(BaseModel):
    lead_id: int
    enabled: bool


class LeadOut(BaseModel):
    id: int
    requirement_id: int
    fit_score: Optional[float]
    status: str
    current_offer_price: Optional[float]
    current_lead_time: Optional[int]
    negotiation_round: int
    buyer_chat_enabled: bool
    supplier_chat_enabled: bool
    ai_paused_for_buyer: bool
    ai_paused_for_supplier: bool
    match_reasons: Optional[List[str]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BuyerDecisionRequest(BaseModel):
    lead_id: int
    # action: accept | renegotiate | manual_chat | decline
    action: str
    renegotiate_target: Optional[str] = None   # e.g. "Get price below 170"


class SupplierEscalationResponse(BaseModel):
    lead_id: int
    # action: accept | counter | hold | decline
    action: str
    counter_price: Optional[float] = None
