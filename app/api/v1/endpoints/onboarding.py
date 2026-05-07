import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.profile import AgenticProfile
from app.schemas.onboarding import (
    GSTVerifyRequest, GSTVerifyResponse,
    OnboardingRequest, OnboardingResponse,
    ProfileBuildStatusResponse,
)
from app.services.gst_service import verify_gstin, extract_gst_profile
from app.agents.profile_agent import (
    build_profile_from_multiple_urls,
    enrich_profile_with_gst,
    generate_profile_summary,
)
from app.agents.supplier_agent import get_default_agent_config
from app.models.user_config import UserConfig
from app.agents.config_agent import build_profile_md, DEFAULT_BUYER_SETTINGS, DEFAULT_SELLER_SETTINGS

INDIAMART_PATTERN = "indiamart.com"

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
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Complete onboarding:
    1. Verify GSTIN (mandatory)
    2. Create agentic profile with GST data
    3. Trigger background job to build profile from URLs via Qwen3
    """
    # Check if already onboarded
    existing = await db.execute(
        select(AgenticProfile).where(AgenticProfile.user_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User already onboarded")

    # Verify GST
    gst_result = await verify_gstin(request.gstin)
    if not gst_result["valid"]:
        raise HTTPException(status_code=400, detail=gst_result["error"])

    gst_data = gst_result["data"]
    gst_profile = extract_gst_profile(gst_data)

    # Create profile with GST data
    profile = AgenticProfile(
        user_id=current_user.id,
        gstin=request.gstin.upper(),
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

    # Mark user as onboarded
    current_user.is_onboarded = True

    # Create initial UserConfig with GST-based profile_md
    from sqlalchemy import select as sel3
    from app.agents.config_agent import build_profile_md, DEFAULT_BUYER_SETTINGS, DEFAULT_SELLER_SETTINGS
    cfg_result2 = await db.execute(sel3(UserConfig).where(UserConfig.user_id == current_user.id))
    existing_cfg = cfg_result2.scalar_one_or_none()
    if not existing_cfg:
        initial_profile_md = build_profile_md(gst_data, {})
        initial_cfg = UserConfig(
            user_id=current_user.id,
            profile_md=initial_profile_md,
            buyer_settings_md=DEFAULT_BUYER_SETTINGS,
            seller_settings_md=DEFAULT_SELLER_SETTINGS,
        )
        db.add(initial_cfg)
    await db.flush()

    # Filter to IndiaMART links only
    valid_links = [l for l in (request.links or []) if l.strip() and INDIAMART_PATTERN in l.lower()]

    # Trigger background profile building from URLs if provided
    if valid_links:
        profile.profile_build_status = "building"
        profile.profile_build_stage = "crawl|Connecting to IndiaMART..."
        background_tasks.add_task(
            _build_profile_from_links,
            profile_id=profile.id,
            links=valid_links,
            gst_data=gst_data,
        )

    return OnboardingResponse(
        success=True,
        profile_id=profile.id,
        trade_name=gst_profile["trade_name"] or gst_profile["legal_name"],
        profile_build_status=profile.profile_build_status,
        message=(
            "Profile is being built from your IndiaMART link. This takes 30-60 seconds."
            if valid_links else
            "Profile created from GST data. Add your IndiaMART link later to enhance your profile."
        ),
    )


@router.get("/profile-status", response_model=ProfileBuildStatusResponse)
async def get_profile_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Poll profile build status during onboarding."""
    result = await db.execute(
        select(AgenticProfile).where(AgenticProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Complete onboarding first.")

    stage_raw = profile.profile_build_stage or ""
    stage_name = stage_raw.split("|")[0] if "|" in stage_raw else stage_raw
    stage_detail = stage_raw.split("|")[1] if "|" in stage_raw else ""

    return ProfileBuildStatusResponse(
        profile_id=profile.id,
        status=profile.profile_build_status,
        stage=stage_name or None,
        stage_detail=stage_detail or None,
        trade_name=profile.trade_name,
        product_categories=profile.product_categories,
        business_summary=profile.profile_summary,
        is_supplier=profile.is_supplier,
        is_buyer=profile.is_buyer,
    )


async def _build_profile_from_links(profile_id: int, links: list, gst_data: dict):
    """Background task: run multi-agent pipeline to build profile from IndiaMART URL."""
    from app.db.base import AsyncSessionLocal

    async def update_stage(stage: str, detail: str = ""):
        """Write pipeline stage to DB so frontend can poll it."""
        async with AsyncSessionLocal() as sess:
            res = await sess.execute(select(AgenticProfile).where(AgenticProfile.id == profile_id))
            p = res.scalar_one_or_none()
            if p:
                p.profile_build_stage = f"{stage}|{detail}"
                await sess.commit()

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(AgenticProfile).where(AgenticProfile.id == profile_id)
            )
            profile = result.scalar_one_or_none()
            if not profile:
                return

            # Run the multi-agent pipeline with progress tracking
            pipeline_result = await build_profile_from_multiple_urls(links, on_progress=update_stage)

            if not pipeline_result:
                profile.profile_build_status = "complete"
                profile.profile_build_stage = "complete|No data extracted"
                await db.commit()
                return

            # Merge with GST data
            await update_stage("finalize", "Merging with GST data...")
            merged = await enrich_profile_with_gst(pipeline_result, gst_data)

            # Generate business summary
            await update_stage("finalize", "Generating business summary...")
            summary = await generate_profile_summary(merged)

            # Update profile with extracted data
            profile.product_categories = merged.get("product_categories")
            profile.capabilities = merged.get("capabilities")
            profile.pricing_bands = merged.get("pricing_bands")
            profile.min_order_quantities = merged.get("min_order_quantities")
            profile.max_order_quantities = merged.get("max_order_quantities")
            profile.certifications = merged.get("certifications")
            profile.is_supplier = merged.get("is_supplier", True)
            profile.is_buyer = merged.get("is_buyer", False)
            profile.profile_summary = summary
            profile.profile_build_status = "complete"
            profile.profile_build_stage = "complete|Pipeline complete!"

            # Auto-generate profile_md for user config
            profile_md_text = build_profile_md(gst_data, merged)

            from sqlalchemy import select as sel2
            cfg_result = await db.execute(sel2(UserConfig).where(UserConfig.user_id == profile.user_id))
            cfg = cfg_result.scalar_one_or_none()
            if not cfg:
                cfg = UserConfig(
                    user_id=profile.user_id,
                    profile_md=profile_md_text,
                    buyer_settings_md=DEFAULT_BUYER_SETTINGS,
                    seller_settings_md=DEFAULT_SELLER_SETTINGS,
                )
                db.add(cfg)
            else:
                cfg.profile_md = profile_md_text

            await db.commit()

        except Exception:
            async with AsyncSessionLocal() as db2:
                result = await db2.execute(
                    select(AgenticProfile).where(AgenticProfile.id == profile_id)
                )
                profile = result.scalar_one_or_none()
                if profile:
                    profile.profile_build_status = "failed"
                    profile.profile_build_stage = "failed|Pipeline error"
                    await db2.commit()
