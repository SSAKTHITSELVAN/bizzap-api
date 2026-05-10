import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db

logger = logging.getLogger(__name__)
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.profile import AgenticProfile
from app.schemas.onboarding import (
    GSTVerifyRequest, GSTVerifyResponse,
    OnboardingRequest, OnboardingResponse,
)
from app.services.gst_service import verify_gstin, extract_gst_profile
from app.agents.supplier_agent import get_default_agent_config
from app.models.user_config import UserConfig
from app.agents.config_agent import build_profile_md, DEFAULT_BUYER_SETTINGS, DEFAULT_SELLER_SETTINGS

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


@router.post("/verify-gst", response_model=GSTVerifyResponse)
async def verify_gst(
    request: GSTVerifyRequest,
    current_user: User = Depends(get_current_user),
):
    """Verify GSTIN and preview business details before full onboarding."""
    result = await verify_gstin(request.gstin)

    if not result["valid"]:
        return GSTVerifyResponse(valid=False, error=result["error"])

    gst_data = result["data"]
    profile = extract_gst_profile(gst_data)

    return GSTVerifyResponse(
        valid=True,
        legal_name=profile["legal_name"],
        trade_name=profile["trade_name"],
        business_type=profile["business_type"],
        gst_status=profile["gst_status"],
        address=profile["address"],
        state=profile["state"],
        city=profile["city"],
    )


@router.post("/complete", response_model=OnboardingResponse)
async def complete_onboarding(
    request: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Complete onboarding:
    1. Verify GSTIN (mandatory)
    2. Create agentic profile with GST data
    3. Mark user as onboarded
    """
    # Check if user already has a profile (resume incomplete onboarding)
    existing_result = await db.execute(
        select(AgenticProfile).where(AgenticProfile.user_id == current_user.id)
    )
    existing_profile = existing_result.scalar_one_or_none()
    if existing_profile:
        current_user.is_onboarded = True
        await db.commit()
        return OnboardingResponse(
            success=True,
            profile_id=existing_profile.id,
            trade_name=existing_profile.trade_name or existing_profile.legal_name,
        )

    # Check if GSTIN is already used by another user
    gstin_upper = request.gstin.upper()
    gstin_result = await db.execute(
        select(AgenticProfile).where(AgenticProfile.gstin == gstin_upper)
    )
    if gstin_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="This GSTIN is already registered with another account")

    gst_result = await verify_gstin(request.gstin)
    if not gst_result["valid"]:
        raise HTTPException(status_code=400, detail=gst_result["error"])

    gst_data = gst_result["data"]
    gst_profile = extract_gst_profile(gst_data)

    profile = AgenticProfile(
        user_id=current_user.id,
        gstin=gstin_upper,
        legal_name=gst_profile["legal_name"],
        trade_name=gst_profile["trade_name"],
        business_type=gst_profile["business_type"],
        gst_status=gst_profile["gst_status"],
        registration_date=gst_profile["registration_date"],
        address=gst_profile["address"],
        state=gst_profile["state"],
        city=gst_profile["city"],
        pincode=gst_profile.get("pincode", ""),
        nature_of_business=gst_profile["nature_of_business"],
        profile_build_status="complete",
        agent_config=get_default_agent_config(),
        is_buyer=True,
        is_supplier=False,
    )
    db.add(profile)
    await db.flush()

    current_user.is_onboarded = True

    cfg_result = await db.execute(select(UserConfig).where(UserConfig.user_id == current_user.id))
    existing_cfg = cfg_result.scalar_one_or_none()
    if not existing_cfg:
        initial_profile_md = build_profile_md(gst_data, {})
        initial_cfg = UserConfig(
            user_id=current_user.id,
            profile_md=initial_profile_md,
            buyer_settings_md=DEFAULT_BUYER_SETTINGS,
            seller_settings_md=DEFAULT_SELLER_SETTINGS,
        )
        db.add(initial_cfg)

    await db.commit()

    return OnboardingResponse(
        success=True,
        profile_id=profile.id,
        trade_name=gst_profile["trade_name"] or gst_profile["legal_name"],
    )
