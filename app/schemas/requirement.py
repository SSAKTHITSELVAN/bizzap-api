from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class RequirementChatMessage(BaseModel):
    message: str
    requirement_id: Optional[int] = None   # None for first message


class RequirementChatResponse(BaseModel):
    requirement_id: int
    ai_response: str
    is_complete: bool
    enrichment_status: str
    requirement_summary: Optional[dict] = None


class ConfirmRequirementRequest(BaseModel):
    requirement_id: int


class RequirementOut(BaseModel):
    id: int
    product: str
    quantity: float
    quantity_unit: Optional[str]
    budget_max: float
    budget_unit: str
    specifications: Optional[dict]
    delivery_location: Optional[str]
    delivery_days: Optional[int]
    order_type: Optional[str]
    enrichment_status: str
    matched_supplier_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class RequirementListResponse(BaseModel):
    requirements: List[RequirementOut]
    total: int
