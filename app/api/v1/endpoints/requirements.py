from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.requirement import Requirement
from app.models.profile import AgenticProfile
from app.models.user_config import UserConfig
from app.schemas.requirement import (
    RequirementChatMessage, RequirementChatResponse,
    ConfirmRequirementRequest, RequirementOut, RequirementListResponse,
)
from app.agents.requirement_agent import process_requirement_message, confirm_requirement
from app.services.matching_service import match_requirement_to_suppliers
from app.api.v1.endpoints.config import get_or_create_config
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/requirements", tags=["Requirements"])


@router.post("/chat", response_model=RequirementChatResponse)
async def requirement_chat(
    request: RequirementChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile_result = await db.execute(
        select(AgenticProfile).where(AgenticProfile.user_id == current_user.id)
    )
    buyer_profile = profile_result.scalar_one_or_none()
    if not buyer_profile:
        raise HTTPException(status_code=400, detail="Complete onboarding first")

    # Load buyer config for agent context
    buyer_cfg = await get_or_create_config(current_user.id, db)

    requirement = None
    if request.requirement_id:
        req_result = await db.execute(
            select(Requirement).where(
                Requirement.id == request.requirement_id,
                Requirement.buyer_id == current_user.id,
            )
        )
        requirement = req_result.scalar_one_or_none()
        if not requirement:
            raise HTTPException(status_code=404, detail="Requirement not found")
        if requirement.enrichment_status == "confirmed":
            raise HTTPException(status_code=400, detail="Requirement already confirmed")

    if not requirement:
        requirement = Requirement(
            buyer_id=current_user.id,
            raw_prompt=request.message,
            product="",
            quantity=0,
            budget_max=0,
            enrichment_status="capturing",
            enrichment_conversation=[],
        )
        db.add(requirement)
        await db.flush()

    conversation_history = requirement.enrichment_conversation or []
    result = await process_requirement_message(
        conversation_history=conversation_history,
        new_message=request.message,
        current_requirement=requirement.structured_json,
        profile_md=buyer_cfg.profile_md or "",
        buyer_settings_md=buyer_cfg.buyer_settings_md or "",
    )

    requirement.enrichment_conversation = result["updated_history"]

    if result["is_complete"] and result["requirement_data"]:
        req_data = result["requirement_data"]
        requirement.product = req_data.get("product", "")
        requirement.quantity = req_data.get("quantity", 0)
        requirement.quantity_unit = req_data.get("quantity_unit")
        requirement.budget_min = req_data.get("budget_min")
        requirement.budget_max = req_data.get("budget_max", 0)
        requirement.budget_unit = req_data.get("budget_unit", "INR")
        requirement.specifications = req_data.get("specifications")
        requirement.delivery_location = req_data.get("delivery_location")
        requirement.delivery_days = req_data.get("delivery_days")
        requirement.order_type = req_data.get("order_type")
        requirement.packaging = req_data.get("packaging")
        requirement.structured_json = req_data
        requirement.enrichment_status = "enriched"

    await db.flush()

    return RequirementChatResponse(
        requirement_id=requirement.id,
        ai_response=result["ai_response"],
        is_complete=result["is_complete"],
        enrichment_status=requirement.enrichment_status,
        requirement_summary=requirement.structured_json if result["is_complete"] else None,
    )


@router.post("/confirm")
async def confirm_requirement_endpoint(
    request: ConfirmRequirementRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req_result = await db.execute(
        select(Requirement).where(
            Requirement.id == request.requirement_id,
            Requirement.buyer_id == current_user.id,
        )
    )
    requirement = req_result.scalar_one_or_none()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
    if requirement.enrichment_status not in ("enriched", "capturing"):
        raise HTTPException(status_code=400, detail=f"Cannot confirm — status: {requirement.enrichment_status}")

    requirement.enrichment_status = "matching"
    requirement.confirmed_at = datetime.utcnow()
    await db.flush()

    background_tasks.add_task(_run_matching, requirement.id)

    return {
        "success": True,
        "requirement_id": requirement.id,
        "message": "Matching suppliers and initiating seller agents. Check leads shortly.",
        "status": "matching",
    }


@router.get("/", response_model=RequirementListResponse)
async def list_requirements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20,
):
    result = await db.execute(
        select(Requirement)
        .where(Requirement.buyer_id == current_user.id, Requirement.is_active == True)
        .order_by(desc(Requirement.created_at))
        .offset(skip).limit(limit)
    )
    requirements = result.scalars().all()
    return RequirementListResponse(requirements=requirements, total=len(requirements))


@router.get("/{requirement_id}", response_model=RequirementOut)
async def get_requirement(
    requirement_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id,
            Requirement.buyer_id == current_user.id,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")
    return req


async def _run_matching(requirement_id: int):
    """Background: match requirement → create leads → initiate seller agent conversations."""
    from app.db.base import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            req_result = await db.execute(
                select(Requirement).where(Requirement.id == requirement_id)
            )
            requirement = req_result.scalar_one_or_none()
            if not requirement:
                return

            leads = await match_requirement_to_suppliers(requirement, db)
            await db.commit()

            logger.info(f"[MATCH] Requirement #{requirement_id}: {len(leads)} leads — initiating seller agents")

            for lead in leads:
                await _initiate_seller_conversation(lead.id)

        except Exception as e:
            logger.error(f"[MATCH] Error for requirement #{requirement_id}: {e}")
            import traceback; traceback.print_exc()


async def _initiate_seller_conversation(lead_id: int):
    """
    Seller AI initiates first — reads full profile + seller settings.
    Then buyer AI responds. Unlimited rounds until deal confirmed.
    """
    from app.db.base import AsyncSessionLocal
    from app.models.lead import Lead
    from app.models.conversation import Conversation, Message
    from app.agents.supplier_agent import generate_supplier_opener, get_default_agent_config
    from app.agents.buyer_agent import buyer_agent_respond
    from app.agents.config_agent import build_agent_system_prompt

    async with AsyncSessionLocal() as db:
        try:
            lead_result = await db.execute(select(Lead).where(Lead.id == lead_id))
            lead = lead_result.scalar_one_or_none()
            if not lead:
                return

            req_result = await db.execute(
                select(Requirement).where(Requirement.id == lead.requirement_id)
            )
            requirement = req_result.scalar_one_or_none()

            supplier_profile_result = await db.execute(
                select(AgenticProfile).where(AgenticProfile.user_id == lead.supplier_id)
            )
            supplier_profile = supplier_profile_result.scalar_one_or_none()

            if not requirement or not supplier_profile:
                logger.warning(f"[CONV] Lead #{lead_id}: missing req or supplier profile")
                return

            # Load FULL seller config — profile + seller settings
            seller_cfg_result = await db.execute(
                select(UserConfig).where(UserConfig.user_id == lead.supplier_id)
            )
            seller_cfg = seller_cfg_result.scalar_one_or_none()
            seller_profile_md      = seller_cfg.profile_md if seller_cfg else ""
            seller_settings_md     = seller_cfg.seller_settings_md if seller_cfg else ""

            # Load buyer config for buyer agent
            buyer_cfg_result = await db.execute(
                select(UserConfig).where(UserConfig.user_id == lead.buyer_id)
            )
            buyer_cfg = buyer_cfg_result.scalar_one_or_none()
            buyer_profile_md   = buyer_cfg.profile_md if buyer_cfg else ""
            buyer_settings_md  = buyer_cfg.buyer_settings_md if buyer_cfg else ""

            req_dict = {
                "product":           requirement.product,
                "quantity":          requirement.quantity,
                "quantity_unit":     requirement.quantity_unit,
                "budget_max":        requirement.budget_max,
                "specifications":    requirement.specifications or {},
                "delivery_location": requirement.delivery_location,
                "delivery_days":     requirement.delivery_days,
            }

            supplier_profile_dict = {
                "trade_name":         supplier_profile.trade_name or "Supplier",
                "product_categories": supplier_profile.product_categories or [],
                "pricing_bands":      supplier_profile.pricing_bands or {},
                "serviceable_locations": supplier_profile.serviceable_locations or [],
                "state":              supplier_profile.state,
                "city":               supplier_profile.city,
                "certifications":     supplier_profile.certifications or [],
            }

            agent_config = supplier_profile.agent_config or get_default_agent_config()

            # STEP 1: SELLER AI initiates — reads full profile + settings
            logger.info(f"[CONV] Lead #{lead_id}: seller AI initiating")
            seller_opener = await generate_supplier_opener(
                requirement=req_dict,
                supplier_profile=supplier_profile_dict,
                agent_config=agent_config,
                profile_md=seller_profile_md,
                seller_settings_md=seller_settings_md,
            )
            seller_msg_text = seller_opener.get("message", "")

            # Create conversation
            conversation = Conversation(
                lead_id=lead.id,
                buyer_id=lead.buyer_id,
                supplier_id=lead.supplier_id,
                mode="ai_negotiating",
                ai_context=[{"role": "assistant", "content": seller_msg_text}],
            )
            db.add(conversation)
            await db.flush()

            # Save seller opening message
            db.add(Message(
                conversation_id=conversation.id,
                role="ai_supplier",
                message_type="text",
                content=seller_msg_text,
                structured_data={"offer": seller_opener.get("extracted_offer")},
            ))

            # Update lead with any initial offer
            if seller_opener.get("extracted_offer"):
                offer = seller_opener["extracted_offer"]
                lead.current_offer_price = offer.get("price_per_unit")
                lead.current_lead_time   = offer.get("lead_time_days")

            await db.flush()

            # STEP 2: BUYER AI responds immediately
            logger.info(f"[CONV] Lead #{lead_id}: buyer AI responding to seller opener")
            buyer_response = await buyer_agent_respond(
                conversation_history=[{"role": "ai_supplier", "content": seller_msg_text}],
                supplier_message=seller_msg_text,
                requirement=req_dict,
                negotiation_round=1,
                max_rounds=999,  # Unlimited — runs until deal confirmed
                profile_md=buyer_profile_md,
                buyer_settings_md=buyer_settings_md,
            )
            buyer_msg_text = buyer_response.get("message", "")

            db.add(Message(
                conversation_id=conversation.id,
                role="ai_buyer",
                message_type="text",
                content=buyer_msg_text,
                structured_data={"offer": buyer_response.get("extracted_offer")},
            ))

            # Update AI context
            conversation.ai_context = [
                {"role": "assistant", "content": seller_msg_text},
                {"role": "user",      "content": buyer_msg_text},
            ]

            lead.status = "negotiating"
            lead.negotiation_round = 1
            lead.max_negotiation_rounds = 999  # Unlimited

            await db.commit()
            logger.info(f"[CONV] Lead #{lead_id}: seller opened, buyer responded ✓ — starting autonomous loop")

            # Kick off autonomous negotiation loop
            import asyncio
            from app.api.v1.endpoints.conversations import _run_autonomous_negotiation_round
            asyncio.create_task(_run_autonomous_negotiation_round(lead_id))

        except Exception as e:
            logger.error(f"[CONV] Lead #{lead_id}: error — {e}")
            import traceback; traceback.print_exc()