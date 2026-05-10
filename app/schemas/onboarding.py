from pydantic import BaseModel
from typing import Optional


class GSTVerifyRequest(BaseModel):
    gstin: str


class GSTVerifyResponse(BaseModel):
    valid: bool
    legal_name: Optional[str] = None
    trade_name: Optional[str] = None
    business_type: Optional[str] = None
    gst_status: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    error: Optional[str] = None


class OnboardingRequest(BaseModel):
    gstin: str


class OnboardingResponse(BaseModel):
    success: bool
    profile_id: int
    trade_name: str
