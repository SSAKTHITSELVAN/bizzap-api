"""
Matching Service — matches confirmed buyer requirements against supplier profiles.
Creates Lead records for each match, then initiates agent conversations.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.models.profile import AgenticProfile
from app.models.requirement import Requirement
from app.models.lead import Lead
import asyncio
import logging

logger = logging.getLogger(__name__)

MINIMUM_FIT_SCORE = 40.0


async def match_requirement_to_suppliers(
    requirement: Requirement,
    db: AsyncSession,
) -> List[Lead]:
    """
    Find all supplier profiles that match this requirement.
    Creates Lead records for all matches above threshold.
    """
    # Fetch ALL profiles except the buyer — no filter on is_supplier or status
    result = await db.execute(
        select(AgenticProfile).where(
            AgenticProfile.user_id != requirement.buyer_id,
        )
    )
    supplier_profiles = result.scalars().all()

    logger.info(f"[MATCH] Requirement #{requirement.id} ({requirement.product}): "
                f"found {len(supplier_profiles)} potential suppliers")

    if not supplier_profiles:
        logger.warning(f"[MATCH] No other profiles in DB — only 1 user registered")
        requirement.enrichment_status = "matched"
        requirement.matched_supplier_count = 0
        await db.flush()
        return []

    req_dict = _requirement_to_dict(requirement)
    leads_created = []

    for profile in supplier_profiles:
        lead = await _create_lead(profile, req_dict, requirement, db)
        if lead:
            leads_created.append(lead)
            logger.info(f"[MATCH] Created lead #{lead.id} → supplier user #{profile.user_id} "
                        f"({profile.trade_name}) fit={lead.fit_score:.0f}%")

    requirement.matched_supplier_count = len(leads_created)
    requirement.enrichment_status = "matched"
    await db.flush()

    logger.info(f"[MATCH] Requirement #{requirement.id}: {len(leads_created)} leads created")
    return leads_created


async def _create_lead(
    supplier_profile: AgenticProfile,
    requirement_dict: dict,
    requirement: Requirement,
    db: AsyncSession,
) -> Lead | None:
    try:
        fit_score = _calculate_basic_fit(requirement_dict, supplier_profile)

        # Check if lead already exists
        existing = await db.execute(
            select(Lead).where(
                Lead.requirement_id == requirement.id,
                Lead.supplier_id == supplier_profile.user_id,
            )
        )
        if existing.scalar_one_or_none():
            logger.info(f"[MATCH] Lead already exists for supplier #{supplier_profile.user_id}")
            return None

        match_reasons = [f"Fit score: {fit_score:.0f}%"]
        if supplier_profile.product_categories:
            match_reasons.append(f"Products: {', '.join(supplier_profile.product_categories[:2])}")
        if supplier_profile.state:
            match_reasons.append(f"Location: {supplier_profile.state}")

        lead = Lead(
            requirement_id=requirement.id,
            buyer_id=requirement.buyer_id,
            supplier_id=supplier_profile.user_id,
            fit_score=fit_score,
            match_reasons=match_reasons,
            status="new",
        )
        db.add(lead)
        await db.flush()
        return lead

    except Exception as e:
        logger.error(f"[MATCH] Error creating lead for supplier #{supplier_profile.user_id}: {e}")
        return None


def _calculate_basic_fit(requirement: dict, profile: AgenticProfile) -> float:
    """Fast rule-based fit score — no AI call needed."""
    score = 60.0  # base — any registered user is a potential supplier

    # Product category match
    cats = profile.product_categories or []
    product = (requirement.get("product") or "").lower()
    if cats:
        for cat in cats:
            if any(word in cat.lower() for word in product.split() if len(word) > 3):
                score += 20
                break
    
    # Location match
    location = (requirement.get("delivery_location") or "").lower()
    state = (profile.state or "").lower()
    city  = (profile.city or "").lower()
    if location and state and (state in location or city in location):
        score += 15

    # Has pricing info
    if profile.pricing_bands:
        score += 5

    return min(score, 100.0)


def _requirement_to_dict(req: Requirement) -> dict:
    return {
        "product": req.product,
        "quantity": req.quantity,
        "quantity_unit": req.quantity_unit,
        "budget_min": req.budget_min,
        "budget_max": req.budget_max,
        "budget_unit": req.budget_unit,
        "specifications": req.specifications or {},
        "delivery_location": req.delivery_location,
        "delivery_days": req.delivery_days,
        "order_type": req.order_type,
    }


def _profile_to_dict(profile: AgenticProfile) -> dict:
    return {
        "trade_name": profile.trade_name,
        "product_categories": profile.product_categories or [],
        "capabilities": profile.capabilities or {},
        "pricing_bands": profile.pricing_bands or {},
        "serviceable_locations": profile.serviceable_locations or [],
        "state": profile.state,
        "city": profile.city,
        "reliability_score": profile.reliability_score,
    }
