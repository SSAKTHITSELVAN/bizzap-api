from pydantic import BaseModel
from typing import Optional, List


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
    links: Optional[List[str]] = []   # IndiaMART, Alibaba, LinkedIn URLs


class OnboardingResponse(BaseModel):
    success: bool
    profile_id: int
    trade_name: str
    profile_build_status: str   # building | complete
    message: str


class ProfileBuildStatusResponse(BaseModel):
    profile_id: int
    status: str
    trade_name: Optional[str] = None
    product_categories: Optional[List[str]] = None
    business_summary: Optional[str] = None
    is_supplier: bool
    is_buyer: bool
