"""OTP Service — static OTP for development."""
from datetime import datetime, timedelta
from app.core.config import settings


def generate_otp(phone: str) -> str:
    """Return static OTP for MVP development."""
    return settings.STATIC_OTP


def get_otp_expiry() -> datetime:
    return datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)


def verify_otp(stored_otp: str, submitted_otp: str, expires_at: datetime) -> bool:
    if datetime.utcnow() > expires_at:
        return False
    return stored_otp == submitted_otp
