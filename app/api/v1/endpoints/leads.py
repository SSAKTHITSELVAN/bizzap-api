from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, desc
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.lead import Lead
from app.models.profile import AgenticProfile
from app.schemas.conversation import LeadOut

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get("/", response_model=list[LeadOut])
async def list_leads(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20,
):
    """List all leads where current user is buyer or supplier."""
    result = await db.execute(
        select(Lead)
        .where(or_(Lead.buyer_id == current_user.id, Lead.supplier_id == current_user.id))
        .order_by(desc(Lead.created_at))
        .offset(skip).limit(limit)
    )
    leads = result.scalars().all()
    return leads


@router.get("/as-buyer", response_model=list[LeadOut])
async def list_leads_as_buyer(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List leads where current user is the buyer."""
    result = await db.execute(
        select(Lead)
        .where(Lead.buyer_id == current_user.id)
        .order_by(desc(Lead.updated_at))
    )
    return result.scalars().all()


@router.get("/as-supplier", response_model=list[LeadOut])
async def list_leads_as_supplier(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List leads where current user is the supplier."""
    result = await db.execute(
        select(Lead)
        .where(Lead.supplier_id == current_user.id)
        .order_by(desc(Lead.updated_at))
    )
    return result.scalars().all()


@router.get("/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Lead).where(
            Lead.id == lead_id,
            or_(Lead.buyer_id == current_user.id, Lead.supplier_id == current_user.id),
        )
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.get("/{lead_id}/counterpart-profile")
async def get_counterpart_profile(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get basic profile of the counterpart (buyer sees supplier, supplier sees buyer)."""
    result = await db.execute(
        select(Lead).where(
            Lead.id == lead_id,
            or_(Lead.buyer_id == current_user.id, Lead.supplier_id == current_user.id),
        )
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    counterpart_id = lead.supplier_id if current_user.id == lead.buyer_id else lead.buyer_id

    profile_result = await db.execute(
        select(AgenticProfile).where(AgenticProfile.user_id == counterpart_id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Return limited profile info (privacy — don't expose everything before deal)
    is_deal_closed = lead.status == "deal_closed"
    return {
        "trade_name": profile.trade_name,
        "business_type": profile.business_type,
        "state": profile.state,
        "city": profile.city if is_deal_closed else None,
        "reliability_score": profile.reliability_score,
        "product_categories": profile.product_categories,
        "certifications": profile.certifications,
        "business_summary": profile.profile_summary,
        # Full contact only after deal closed
        "contact_revealed": is_deal_closed,
    }
