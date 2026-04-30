from pydantic import BaseModel, field_validator
import re


class SendOTPRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        v = v.strip().replace(" ", "").replace("-", "")
        if not re.match(r"^\+?[6-9]\d{9}$", v):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        if not v.startswith("+"):
            v = "+91" + v.lstrip("0")
        return v


class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        v = v.strip().replace(" ", "").replace("-", "")
        if not v.startswith("+"):
            v = "+91" + v.lstrip("0")
        return v


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_new_user: bool
    is_onboarded: bool
    user_id: int
