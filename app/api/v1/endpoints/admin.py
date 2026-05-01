"""
Admin endpoint — overview of all posts, buyers, sellers, matches.
No auth for now (add API key in production).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.db.base import get_db
from app.models.user import User
from app.models.profile import AgenticProfile
from app.models.requirement import Requirement
from app.models.lead import Lead
from app.models.conversation import Conversation, Message
from app.models.deal import Deal

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/overview")
async def admin_overview(db: AsyncSession = Depends(get_db)):
    """Full system overview — users, posts, matches, deals."""

    # Users
    users_result = await db.execute(select(User))
    users = users_result.scalars().all()

    # Profiles
    profiles_result = await db.execute(select(AgenticProfile))
    profiles = profiles_result.scalars().all()

    # Requirements
    reqs_result = await db.execute(select(Requirement).order_by(Requirement.created_at.desc()))
    reqs = reqs_result.scalars().all()

    # Leads
    leads_result = await db.execute(select(Lead).order_by(Lead.created_at.desc()))
    leads = leads_result.scalars().all()

    # Deals
    deals_result = await db.execute(select(Deal).order_by(Deal.confirmed_at.desc()))
    deals = deals_result.scalars().all()

    # Build profile map
    profile_map = {p.user_id: p for p in profiles}

    return {
        "summary": {
            "total_users": len(users),
            "total_profiles": len(profiles),
            "buyers": sum(1 for p in profiles if p.is_buyer),
            "suppliers": sum(1 for p in profiles if p.is_supplier),
            "total_requirements": len(reqs),
            "active_requirements": sum(1 for r in reqs if r.is_active and r.enrichment_status not in ("closed",)),
            "confirmed_requirements": sum(1 for r in reqs if r.enrichment_status in ("matched", "confirmed", "matching")),
            "total_leads": len(leads),
            "active_leads": sum(1 for l in leads if l.status in ("agent_initiated", "negotiating", "renegotiating")),
            "deals_closed": sum(1 for l in leads if l.status == "deal_closed"),
            "total_deals": len(deals),
        },

        "users": [
            {
                "id": u.id,
                "phone": u.phone,
                "is_onboarded": u.is_onboarded,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "profile": {
                    "trade_name": profile_map[u.id].trade_name if u.id in profile_map else None,
                    "is_buyer": profile_map[u.id].is_buyer if u.id in profile_map else None,
                    "is_supplier": profile_map[u.id].is_supplier if u.id in profile_map else None,
                    "profile_build_status": profile_map[u.id].profile_build_status if u.id in profile_map else None,
                    "gstin": profile_map[u.id].gstin if u.id in profile_map else None,
                    "state": profile_map[u.id].state if u.id in profile_map else None,
                    "product_categories": profile_map[u.id].product_categories if u.id in profile_map else None,
                } if u.id in profile_map else None,
            }
            for u in users
        ],

        "requirements": [
            {
                "id": r.id,
                "buyer_id": r.buyer_id,
                "buyer_name": profile_map.get(r.buyer_id, {}).trade_name if r.buyer_id in profile_map else f"User #{r.buyer_id}",
                "product": r.product,
                "quantity": r.quantity,
                "quantity_unit": r.quantity_unit,
                "budget_max": r.budget_max,
                "delivery_location": r.delivery_location,
                "enrichment_status": r.enrichment_status,
                "matched_supplier_count": r.matched_supplier_count,
                "is_active": r.is_active,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "confirmed_at": r.confirmed_at.isoformat() if r.confirmed_at else None,
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
            }
            for r in reqs
        ],

        "leads": [
            {
                "id": l.id,
                "requirement_id": l.requirement_id,
                "buyer_id": l.buyer_id,
                "supplier_id": l.supplier_id,
                "buyer_name": profile_map.get(l.buyer_id, AgenticProfile()).trade_name if l.buyer_id in profile_map else f"User #{l.buyer_id}",
                "supplier_name": profile_map.get(l.supplier_id, AgenticProfile()).trade_name if l.supplier_id in profile_map else f"User #{l.supplier_id}",
                "fit_score": l.fit_score,
                "status": l.status,
                "current_offer_price": l.current_offer_price,
                "negotiation_round": l.negotiation_round,
                "ai_paused_for_buyer": l.ai_paused_for_buyer,
                "ai_paused_for_supplier": l.ai_paused_for_supplier,
                "created_at": l.created_at.isoformat() if l.created_at else None,
                "match_reasons": l.match_reasons,
            }
            for l in leads
        ],

        "deals": [
            {
                "id": d.id,
                "lead_id": d.lead_id,
                "buyer_name": profile_map.get(d.buyer_id, AgenticProfile()).trade_name if d.buyer_id in profile_map else f"User #{d.buyer_id}",
                "supplier_name": profile_map.get(d.supplier_id, AgenticProfile()).trade_name if d.supplier_id in profile_map else f"User #{d.supplier_id}",
                "product": d.product,
                "quantity": d.quantity,
                "final_price_per_unit": d.final_price_per_unit,
                "total_value": d.total_value,
                "status": d.status,
                "confirmed_at": d.confirmed_at.isoformat() if d.confirmed_at else None,
            }
            for d in deals
        ],

        "matching_debug": {
            "profiles_with_is_supplier_true": sum(1 for p in profiles if p.is_supplier),
            "profiles_with_status_complete": sum(1 for p in profiles if p.profile_build_status == "complete"),
            "profiles_eligible_for_matching": sum(1 for p in profiles if p.is_supplier and p.profile_build_status == "complete"),
            "warning": "If 0 eligible profiles → no leads will ever be created. Fix: set is_supplier=True and profile_build_status=complete" if sum(1 for p in profiles if p.is_supplier and p.profile_build_status == "complete") == 0 else "OK",
        }
    }


@router.post("/fix-profiles")
async def fix_profiles(db: AsyncSession = Depends(get_db)):
    """
    Dev utility — marks all onboarded profiles as both buyer+supplier
    and sets profile_build_status=complete so matching works.
    USE ONLY IN DEVELOPMENT.
    """
    result = await db.execute(select(AgenticProfile))
    profiles = result.scalars().all()

    fixed = []
    for p in profiles:
        changed = False
        if not p.is_supplier:
            p.is_supplier = True
            changed = True
        if p.profile_build_status != "complete":
            p.profile_build_status = "complete"
            changed = True
        if changed:
            fixed.append(p.user_id)

    await db.flush()
    return {
        "fixed": fixed,
        "message": f"Set is_supplier=True and profile_build_status=complete for {len(fixed)} profiles"
    }


@router.get("/conversations/{lead_id}")
async def get_lead_conversation(lead_id: int, db: AsyncSession = Depends(get_db)):
    """See full conversation for any lead."""
    conv_result = await db.execute(
        select(Conversation).where(Conversation.lead_id == lead_id)
    )
    conv = conv_result.scalar_one_or_none()
    if not conv:
        return {"error": "No conversation found", "lead_id": lead_id}

    msg_result = await db.execute(
        select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()

    return {
        "lead_id": lead_id,
        "conversation_id": conv.id,
        "mode": conv.mode,
        "message_count": len(messages),
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ]
    }


@router.post("/rematch/{requirement_id}")
async def rematch_requirement(requirement_id: int, db: AsyncSession = Depends(get_db)):
    """
    Manually re-run matching + initiate agent conversations for a requirement.
    Use this for requirements that got stuck in 'matching' status.
    """
    from app.models.requirement import Requirement
    from app.services.matching_service import match_requirement_to_suppliers

    req_result = await db.execute(
        select(Requirement).where(Requirement.id == requirement_id)
    )
    req = req_result.scalar_one_or_none()
    if not req:
        return {"error": f"Requirement #{requirement_id} not found"}

    # Run matching
    leads = await match_requirement_to_suppliers(req, db)
    await db.commit()

    # Initiate agent conversations for new leads
    from app.api.v1.endpoints.requirements import _initiate_agent_conversation
    initiated = []
    for lead in leads:
        try:
            await _initiate_agent_conversation(lead.id)
            initiated.append(lead.id)
        except Exception as e:
            pass

    return {
        "requirement_id": requirement_id,
        "product": req.product,
        "leads_created": len(leads),
        "conversations_initiated": len(initiated),
        "lead_ids": [l.id for l in leads],
    }


@router.get("/profiles")
async def list_profiles(db: AsyncSession = Depends(get_db)):
    """See all profiles with their matching eligibility."""
    result = await db.execute(select(AgenticProfile))
    profiles = result.scalars().all()

    return [
        {
            "user_id": p.user_id,
            "trade_name": p.trade_name,
            "gstin": p.gstin,
            "is_buyer": p.is_buyer,
            "is_supplier": p.is_supplier,
            "profile_build_status": p.profile_build_status,
            "product_categories": p.product_categories,
            "state": p.state,
            "city": p.city,
            "reliability_score": p.reliability_score,
        }
        for p in profiles
    ]