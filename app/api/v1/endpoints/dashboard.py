from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.lead import Lead
from app.models.deal import Deal
from app.models.requirement import Requirement
from app.models.profile import AgenticProfile
from app.models.conversation import Conversation, Message
from datetime import datetime, timedelta

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full CRM dashboard data for the current user."""
    user_id = current_user.id
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ── Profile ──────────────────────────────────────
    profile_result = await db.execute(
        select(AgenticProfile).where(AgenticProfile.user_id == user_id)
    )
    profile = profile_result.scalar_one_or_none()

    # ── Active leads (agent working) ─────────────────
    active_statuses = ["agent_initiated", "negotiating", "renegotiating"]
    active_leads_result = await db.execute(
        select(Lead).where(
            or_(Lead.buyer_id == user_id, Lead.supplier_id == user_id),
            Lead.status.in_(active_statuses),
        )
    )
    active_leads = active_leads_result.scalars().all()

    # ── Leads needing input ──────────────────────────
    paused_buyer = await db.execute(
        select(Lead).where(Lead.buyer_id == user_id, Lead.ai_paused_for_buyer == True)
    )
    paused_supplier = await db.execute(
        select(Lead).where(Lead.supplier_id == user_id, Lead.ai_paused_for_supplier == True)
    )
    needs_input = paused_buyer.scalars().all() + paused_supplier.scalars().all()

    # ── This month's deals ───────────────────────────
    deals_result = await db.execute(
        select(Deal).where(
            or_(Deal.buyer_id == user_id, Deal.supplier_id == user_id),
            Deal.confirmed_at >= month_start,
        )
    )
    month_deals = deals_result.scalars().all()

    sourcing_deals = [d for d in month_deals if d.buyer_id == user_id]
    selling_deals = [d for d in month_deals if d.supplier_id == user_id]

    total_savings = sum(d.buyer_savings or 0 for d in sourcing_deals)
    total_revenue = sum(d.total_value or 0 for d in selling_deals)

    # ── Requirements this month ──────────────────────
    req_result = await db.execute(
        select(Requirement).where(
            Requirement.buyer_id == user_id,
            Requirement.created_at >= month_start,
        )
    )
    month_requirements = req_result.scalars().all()

    # ── Recent deals (last 5) ────────────────────────
    recent_deals_result = await db.execute(
        select(Deal)
        .where(or_(Deal.buyer_id == user_id, Deal.supplier_id == user_id))
        .order_by(Deal.confirmed_at.desc())
        .limit(5)
    )
    recent_deals = recent_deals_result.scalars().all()

    # ── Agent status ─────────────────────────────────
    agent_active = len(active_leads) > 0
    agent_status = "active" if agent_active else "idle"
    if needs_input:
        agent_status = "needs_input"

    return {
        "profile": {
            "trade_name": profile.trade_name if profile else current_user.phone,
            "business_type": profile.business_type if profile else None,
            "is_supplier": profile.is_supplier if profile else False,
            "is_buyer": profile.is_buyer if profile else True,
            "reliability_score": profile.reliability_score if profile else 0,
            "profile_build_status": profile.profile_build_status if profile else "pending",
        },
        "agent": {
            "status": agent_status,
            "active_jobs_count": len(active_leads),
            "needs_input_count": len(needs_input),
        },
        "active_leads": [
            {
                "lead_id": lead.id,
                "role": "buyer" if lead.buyer_id == user_id else "supplier",
                "status": lead.status,
                "current_offer_price": lead.current_offer_price,
                "negotiation_round": lead.negotiation_round,
                "ai_paused": lead.ai_paused_for_buyer if lead.buyer_id == user_id else lead.ai_paused_for_supplier,
            }
            for lead in active_leads + needs_input
        ],
        "this_month": {
            "sourcing": {
                "jobs_run": len(month_requirements),
                "deals_closed": len(sourcing_deals),
                "total_savings": total_savings,
            },
            "selling": {
                "deals_closed": len(selling_deals),
                "total_revenue": total_revenue,
            },
            "total_value_created": total_savings + total_revenue,
            "period": month_start.strftime("%B %Y"),
        },
        "recent_deals": [
            {
                "deal_id": deal.id,
                "product": deal.product,
                "quantity": deal.quantity,
                "quantity_unit": deal.quantity_unit,
                "final_price_per_unit": deal.final_price_per_unit,
                "total_value": deal.total_value,
                "role": "buyer" if deal.buyer_id == user_id else "supplier",
                "status": deal.status,
                "buyer_savings": deal.buyer_savings,
                "confirmed_at": deal.confirmed_at.isoformat(),
            }
            for deal in recent_deals
        ],
    }
