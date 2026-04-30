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
    """Create conversation and have buyer agent send the opening message."""
    from app.db.base import AsyncSessionLocal
    from app.models.lead import Lead
    from app.models.conversation import Conversation, Message
    from app.agents.buyer_agent import generate_buyer_opener

    async with AsyncSessionLocal() as db:
        try:
            lead_result = await db.execute(
                select(Lead).where(Lead.id == lead_id)
            )
            lead = lead_result.scalar_one_or_none()
            if not lead:
                return

            # Get buyer profile and requirement
            req_result = await db.execute(
                select(Requirement).where(Requirement.id == lead.requirement_id)
            )
            requirement = req_result.scalar_one_or_none()

            supplier_profile_result = await db.execute(
                select(AgenticProfile).where(AgenticProfile.user_id == lead.supplier_id)
            )
            supplier_profile = supplier_profile_result.scalar_one_or_none()

            if not requirement or not supplier_profile:
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
                "trade_name": supplier_profile.trade_name,
                "product_categories": supplier_profile.product_categories or [],
                "city": supplier_profile.city,
                "state": supplier_profile.state,
            }

            opener_result = await generate_buyer_opener(req_dict, supplier_dict)

            # Create conversation
            conversation = Conversation(
                lead_id=lead.id,
                buyer_id=lead.buyer_id,
                supplier_id=lead.supplier_id,
                mode="ai_negotiating",
                ai_context=[{"role": "assistant", "content": opener_result["message"]}],
            )
            db.add(conversation)
            await db.flush()

            # Create first message
            first_msg = Message(
                conversation_id=conversation.id,
                role="ai_buyer",
                message_type="text",
                content=opener_result["message"],
            )
            db.add(first_msg)

            # Update lead status
            lead.status = "agent_initiated"
            await db.commit()

        except Exception as e:
            print(f"Error initiating conversation for lead {lead_id}: {e}")
