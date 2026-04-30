"""Requirement expiry management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.requirement import Requirement

router = APIRouter(prefix="/requirements", tags=["Expiry"])


class SetExpiryRequest(BaseModel):
    requirement_id: int
    expires_at: Optional[datetime] = None  # None = remove expiry


@router.post("/set-expiry")
async def set_expiry(
    request: SetExpiryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Requirement).where(
            Requirement.id == request.requirement_id,
            Requirement.buyer_id == current_user.id,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    req.expires_at = request.expires_at
    await db.flush()
    return {
        "success": True,
        "requirement_id": req.id,
        "expires_at": req.expires_at.isoformat() if req.expires_at else None,
    }


@router.post("/expire/{requirement_id}")
async def manually_expire(
    requirement_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually mark a requirement as expired/closed."""
    result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id,
            Requirement.buyer_id == current_user.id,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    req.is_expired = True
    req.is_active = False
    req.enrichment_status = "closed"
    await db.flush()
    return {"success": True, "requirement_id": req.id, "status": "closed"}
