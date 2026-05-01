from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.requirement import Requirement
from app.models.profile import AgenticProfile
from app.schemas.requirement import (
    RequirementChatMessage, RequirementChatResponse,
    ConfirmRequirementRequest, RequirementOut, RequirementListResponse,
)
from app.agents.requirement_agent import process_requirement_message, confirm_requirement
from app.services.matching_service import match_requirement_to_suppliers
from datetime import datetime

router = APIRouter(prefix="/requirements", tags=["Requirements"])


@router.post("/chat", response_model=RequirementChatResponse)
async def requirement_chat(
    request: RequirementChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Conversational requirement collection.
    First message creates the requirement, subsequent messages enrich it.
    """
    # Fetch buyer profile
    profile_result = await db.execute(
        select(AgenticProfile).where(AgenticProfile.user_id == current_user.id)
    )
    buyer_profile = profile_result.scalar_one_or_none()

    if not buyer_profile:
        raise HTTPException(status_code=400, detail="Complete onboarding first")

    # Get or create requirement
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

    # First message — create requirement
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

    # Process with requirement agent
    conversation_history = requirement.enrichment_conversation or []
    result = await process_requirement_message(
        conversation_history=conversation_history,
        new_message=request.message,
        current_requirement=requirement.structured_json,
    )

    # Update conversation history
    requirement.enrichment_conversation = result["updated_history"]

    # If AI finished collecting data, update requirement fields
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
    """
    Buyer confirms the requirement. Triggers supplier matching and lead creation.
    """
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

    # Trigger matching in background
    background_tasks.add_task(_run_matching, requirement.id)

    return {
        "success": True,
        "requirement_id": requirement.id,
        "message": "Your requirement is being matched with suppliers. Check leads shortly.",
        "status": "matching",
    }


@router.get("/", response_model=RequirementListResponse)
async def list_requirements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 20,
):
    """List all requirements posted by the current buyer."""
    result = await db.execute(
        select(Requirement)
        .where(Requirement.buyer_id == current_user.id, Requirement.is_active == True)
        .order_by(desc(Requirement.created_at))
        .offset(skip).limit(limit)
    )
    requirements = result.scalars().all()

    return RequirementListResponse(
        requirements=requirements,
        total=len(requirements),
    )


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
    """Background task to match requirement with suppliers."""
    from app.db.base import AsyncSessionLocal
    from app.models.conversation import Conversation
    from app.agents.buyer_agent import generate_buyer_opener
    from app.agents.supplier_agent import evaluate_match_signal, get_default_agent_config

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

            # For each matched lead, initiate agent conversation
            for lead in leads:
                await _initiate_agent_conversation(lead.id)

        except Exception as e:
            print(f"Matching error for requirement {requirement_id}: {e}")


async def _initiate_agent_conversation(lead_id: int):
    """
    Full agent conversation initiation:
    1. Buyer AI sends opening message
    2. Supplier AI immediately responds
    This creates the first real exchange visible to both parties.
    """
    from app.db.base import AsyncSessionLocal
    from app.models.lead import Lead
    from app.models.conversation import Conversation, Message
    from app.agents.buyer_agent import generate_buyer_opener
    from app.agents.supplier_agent import supplier_agent_respond, get_default_agent_config
    from app.models.user_config import UserConfig
    import logging
    logger = logging.getLogger(__name__)

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
                logger.warning(f"[CONV] Lead #{lead_id}: missing requirement or supplier profile")
                return

            req_dict = {
                "product": requirement.product,
                "quantity": requirement.quantity,
                "quantity_unit": requirement.quantity_unit,
                "budget_max": requirement.budget_max,
                "specifications": requirement.specifications or {},
                "delivery_location": requirement.delivery_location,
                "delivery_days": requirement.delivery_days,
            }

            supplier_dict = {
                "trade_name": supplier_profile.trade_name or "Supplier",
                "product_categories": supplier_profile.product_categories or [],
                "city": supplier_profile.city,
                "state": supplier_profile.state,
            }

            # Load supplier config (profile_md + seller_settings_md)
            cfg_result = await db.execute(
                select(UserConfig).where(UserConfig.user_id == lead.supplier_id)
            )
            supplier_cfg = cfg_result.scalar_one_or_none()
            profile_md = supplier_cfg.profile_md if supplier_cfg else ""
            seller_settings_md = supplier_cfg.seller_settings_md if supplier_cfg else ""

            # Step 1: Buyer AI generates opening message
            logger.info(f"[CONV] Lead #{lead_id}: generating buyer opener")
            opener_result = await generate_buyer_opener(req_dict, supplier_dict)
            buyer_opener = opener_result["message"]

            # Create conversation
            conversation = Conversation(
                lead_id=lead.id,
                buyer_id=lead.buyer_id,
                supplier_id=lead.supplier_id,
                mode="ai_negotiating",
                ai_context=[{"role": "user", "content": buyer_opener}],
            )
            db.add(conversation)
            await db.flush()

            # Save buyer opener message
            buyer_msg = Message(
                conversation_id=conversation.id,
                role="ai_buyer",
                message_type="text",
                content=buyer_opener,
            )
            db.add(buyer_msg)
            await db.flush()

            # Step 2: Supplier AI immediately responds to buyer opener
            logger.info(f"[CONV] Lead #{lead_id}: supplier AI responding")
            agent_config = supplier_profile.agent_config or get_default_agent_config()

            supplier_response = await supplier_agent_respond(
                conversation_history=[{"role": "user", "content": buyer_opener}],
                buyer_message=buyer_opener,
                supplier_profile={
                    "trade_name": supplier_profile.trade_name or "Supplier",
                    "product_categories": supplier_profile.product_categories or [],
                    "pricing_bands": supplier_profile.pricing_bands or {},
                    "state": supplier_profile.state,
                    "city": supplier_profile.city,
                },
                agent_config=agent_config,
                negotiation_round=1,
                max_rounds=lead.max_negotiation_rounds,
                profile_md=profile_md,
                seller_settings_md=seller_settings_md,
            )

            supplier_reply = supplier_response.get("message", "")

            # Save supplier response message
            supplier_msg = Message(
                conversation_id=conversation.id,
                role="ai_supplier",
                message_type="text",
                content=supplier_reply,
                structured_data={"offer": supplier_response.get("extracted_offer")},
            )
            db.add(supplier_msg)

            # Update AI context with both messages
            conversation.ai_context = [
                {"role": "user",      "content": buyer_opener},
                {"role": "assistant", "content": supplier_reply},
            ]

            # Update lead with any offer data
            if supplier_response.get("extracted_offer"):
                offer = supplier_response["extracted_offer"]
                lead.current_offer_price = offer.get("price_per_unit")
                lead.current_lead_time   = offer.get("lead_time_days")

            lead.status = "negotiating"
            lead.negotiation_round = 1

            await db.commit()
            logger.info(f"[CONV] Lead #{lead_id}: conversation initiated — buyer opened, supplier responded")

        except Exception as e:
            logger.error(f"[CONV] Lead #{lead_id}: error — {e}")
            import traceback
            traceback.print_exc()