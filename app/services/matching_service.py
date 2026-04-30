"""
Matching Service — matches confirmed buyer requirements against all active supplier profiles.
Creates Lead records for each match above the threshold.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.models.profile import AgenticProfile
from app.models.requirement import Requirement
from app.models.lead import Lead
from app.models.user import User
from app.agents.supplier_agent import evaluate_match_signal, get_default_agent_config
import asyncio


MINIMUM_FIT_SCORE = 40.0


async def match_requirement_to_suppliers(
    requirement: Requirement,
    db: AsyncSession,
) -> List[Lead]:
    """
    Find all supplier profiles that match this requirement.
    Creates Lead records for matches above threshold.
    """
    # Fetch all active supplier profiles (excluding the buyer themselves)
    result = await db.execute(
        select(AgenticProfile).where(
            AgenticProfile.is_supplier == True,
            AgenticProfile.user_id != requirement.buyer_id,
            AgenticProfile.profile_build_status == "complete",
        )
    )
    supplier_profiles = result.scalars().all()

    if not supplier_profiles:
        return []

    # Convert requirement to dict for AI evaluation
    req_dict = _requirement_to_dict(requirement)

    # Evaluate each supplier concurrently (batch of 10 to avoid rate limits)
    leads_created = []
    batch_size = 10

    for i in range(0, len(supplier_profiles), batch_size):
        batch = supplier_profiles[i:i + batch_size]
        tasks = [
            _evaluate_and_create_lead(supplier, req_dict, requirement, db)
            for supplier in batch
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for result in results:
            if isinstance(result, Lead):
                leads_created.append(result)

    # Update requirement with match count
    requirement.matched_supplier_count = len(leads_created)
    if leads_created:
        requirement.enrichment_status = "matched"
    await db.flush()

    return leads_created


async def _evaluate_and_create_lead(
    supplier_profile: AgenticProfile,
    requirement_dict: dict,
    requirement: Requirement,
    db: AsyncSession,
) -> Lead | None:
    """Evaluate a single supplier and create a Lead if fit score is sufficient."""
    try:
        profile_dict = _profile_to_dict(supplier_profile)
        agent_config = supplier_profile.agent_config or get_default_agent_config()

        evaluation = await evaluate_match_signal(requirement_dict, profile_dict, agent_config)
        fit_score = evaluation.get("fit_score", 0)

        if fit_score < MINIMUM_FIT_SCORE:
            return None

        # Check if lead already exists
        existing = await db.execute(
            select(Lead).where(
                Lead.requirement_id == requirement.id,
                Lead.supplier_id == supplier_profile.user_id,
            )
        )
        if existing.scalar_one_or_none():
            return None

        # Create lead
        lead = Lead(
            requirement_id=requirement.id,
            buyer_id=requirement.buyer_id,
            supplier_id=supplier_profile.user_id,
            fit_score=fit_score,
            match_reasons=evaluation.get("match_reasons", []),
            status="new" if not evaluation.get("needs_human_approval") else "pending_supplier_approval",
        )
        db.add(lead)
        await db.flush()
        return lead

    except Exception:
        return None


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
        "min_order_quantities": profile.min_order_quantities or {},
        "max_order_quantities": profile.max_order_quantities or {},
        "serviceable_locations": profile.serviceable_locations or [],
        "standard_lead_times": profile.standard_lead_times or {},
        "payment_terms": profile.payment_terms or [],
        "certifications": profile.certifications or [],
        "state": profile.state,
        "city": profile.city,
        "reliability_score": profile.reliability_score,
        "is_supplier": profile.is_supplier,
    }
