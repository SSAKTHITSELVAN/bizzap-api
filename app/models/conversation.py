from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.lead import Lead
from app.models.conversation import Conversation, Message
from app.models.profile import AgenticProfile
from app.models.requirement import Requirement
from app.schemas.conversation import (
    ConversationOut, SendMessageRequest, SendMessageResponse,
    ToggleChatRequest, BuyerDecisionRequest, SupplierEscalationResponse,
    MessageOut,
)
from app.agents.buyer_agent import buyer_agent_respond
from app.agents.supplier_agent import supplier_agent_respond, get_default_agent_config
from app.models.user_config import UserConfig
from app.api.v1.endpoints.config import get_or_create_config
from datetime import datetime

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("/{conversation_id}", response_model=ConversationOut)
async def get_conversation(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full conversation history for a lead."""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Verify user is participant
    if current_user.id not in (conversation.buyer_id, conversation.supplier_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Fetch messages
    msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = msg_result.scalars().all()

    # Filter messages by visibility
    is_buyer = current_user.id == conversation.buyer_id
    visible_messages = [
        m for m in messages
        if (is_buyer and m.is_visible_to_buyer) or (not is_buyer and m.is_visible_to_supplier)
    ]

    # Get lead for chat toggle status
    lead_result = await db.execute(select(Lead).where(Lead.id == conversation.lead_id))
    lead = lead_result.scalar_one_or_none()

    return ConversationOut(
        id=conversation.id,
        lead_id=conversation.lead_id,
        mode=conversation.mode,
        buyer_chat_enabled=lead.buyer_chat_enabled if lead else False,
        supplier_chat_enabled=lead.supplier_chat_enabled if lead else False,
        messages=[MessageOut(
            id=m.id, role=m.role, message_type=m.message_type,
            content=m.content, structured_data=m.structured_data,
            created_at=m.created_at
        ) for m in visible_messages],
        created_at=conversation.created_at,
    )


@router.get("/lead/{lead_id}", response_model=ConversationOut)
async def get_conversation_by_lead(
    lead_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get conversation by lead ID."""
    result = await db.execute(
        select(Conversation).where(Conversation.lead_id == lead_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not started yet")

    return await get_conversation(conversation.id, db, current_user)


@router.post("/send", response_model=SendMessageResponse)
async def send_message(
    request: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a human message in a conversation.
    AI responds automatically unless AI is paused for the other party.
    """
    result = await db.execute(
        select(Conversation).where(Conversation.id == request.conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    is_buyer = current_user.id == conversation.buyer_id
    is_supplier = current_user.id == conversation.supplier_id

    if not is_buyer and not is_supplier:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get lead
    lead_result = await db.execute(select(Lead).where(Lead.id == conversation.lead_id))
    lead = lead_result.scalar_one_or_none()

    # Check if human chat is enabled
    if is_buyer and not lead.buyer_chat_enabled:
        raise HTTPException(
            status_code=403,
            detail="AI is negotiating on your behalf. Enable 'Live' mode to chat manually."
        )
    if is_supplier and not lead.supplier_chat_enabled:
        raise HTTPException(
            status_code=403,
            detail="AI is negotiating on your behalf. Enable 'Live' mode to chat manually."
        )

    # Determine role
    role = "human_buyer" if is_buyer else "human_supplier"

    # Save human message
    human_msg = Message(
        conversation_id=conversation.id,
        role=role,
        message_type="text",
        content=request.content,
    )
    db.add(human_msg)
    await db.flush()

    # AI responds on the other side if AI is still active
    ai_response_msg = None

    if is_buyer and conversation.mode in ("ai_negotiating", "hybrid"):
        # Buyer sent message — supplier's AI responds
        ai_response_msg = await _trigger_supplier_ai_response(
            conversation, lead, request.content, db
        )

    elif is_supplier and conversation.mode in ("ai_negotiating", "hybrid"):
        # Supplier sent message — buyer's AI responds
        ai_response_msg = await _trigger_buyer_ai_response(
            conversation, lead, request.content, db
        )

    await db.flush()

    human_msg_out = MessageOut(
        id=human_msg.id, role=human_msg.role, message_type=human_msg.message_type,
        content=human_msg.content, structured_data=human_msg.structured_data,
        created_at=human_msg.created_at,
    )

    ai_msg_out = None
    if ai_response_msg:
        ai_msg_out = MessageOut(
            id=ai_response_msg.id, role=ai_response_msg.role,
            message_type=ai_response_msg.message_type, content=ai_response_msg.content,
            structured_data=ai_response_msg.structured_data,
            created_at=ai_response_msg.created_at,
        )

    return SendMessageResponse(message=human_msg_out, ai_response=ai_msg_out)


@router.post("/toggle-chat")
async def toggle_human_chat(
    request: ToggleChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Enable or disable human chat for buyer or supplier on a specific lead."""
    lead_result = await db.execute(select(Lead).where(Lead.id == request.lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    is_buyer = current_user.id == lead.buyer_id
    is_supplier = current_user.id == lead.supplier_id

    if not is_buyer and not is_supplier:
        raise HTTPException(status_code=403, detail="Access denied")

    if is_buyer:
        lead.buyer_chat_enabled = request.enabled
    else:
        lead.supplier_chat_enabled = request.enabled

    # Update conversation mode
    conv_result = await db.execute(select(Conversation).where(Conversation.lead_id == lead.id))
    conversation = conv_result.scalar_one_or_none()
    if conversation:
        if lead.buyer_chat_enabled or lead.supplier_chat_enabled:
            conversation.mode = "hybrid"
        else:
            conversation.mode = "ai_negotiating"

    await db.flush()

    return {
        "success": True,
        "lead_id": lead.id,
        "buyer_chat_enabled": lead.buyer_chat_enabled,
        "supplier_chat_enabled": lead.supplier_chat_enabled,
        "mode": conversation.mode if conversation else "ai_negotiating",
    }


@router.post("/buyer-decision")
async def handle_buyer_decision(
    request: BuyerDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Handle buyer's decision on a lead: accept / renegotiate / manual_chat / decline."""
    lead_result = await db.execute(select(Lead).where(Lead.id == request.lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead or lead.buyer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lead not found")

    action = request.action.lower()

    if action == "accept":
        lead.status = "deal_closed"
        lead.deal_closed_at = datetime.utcnow()
        # Create deal record
        await _create_deal(lead, db)
        # Post system message
        await _post_system_message(lead.id, "🎉 Deal accepted! Both parties have been notified.", db)
        return {"success": True, "status": "deal_closed", "message": "Deal confirmed!"}

    elif action == "renegotiate":
        if not request.renegotiate_target:
            raise HTTPException(status_code=400, detail="Provide renegotiate_target")
        lead.status = "renegotiating"
        lead.ai_paused_for_buyer = False
        # Post buyer's renegotiation instruction as a message
        await _post_system_message(
            lead.id,
            f"Buyer wants to renegotiate: {request.renegotiate_target}",
            db,
        )
        return {"success": True, "status": "renegotiating"}

    elif action == "manual_chat":
        lead.buyer_chat_enabled = True
        conv_result = await db.execute(select(Conversation).where(Conversation.lead_id == lead.id))
        conv = conv_result.scalar_one_or_none()
        if conv:
            conv.mode = "hybrid"
        return {"success": True, "status": "manual_chat_enabled"}

    elif action == "decline":
        lead.status = "not_selected"
        await _post_system_message(lead.id, "Buyer has declined this offer.", db)
        return {"success": True, "status": "not_selected"}

    raise HTTPException(status_code=400, detail=f"Unknown action: {action}")


@router.post("/supplier-escalation")
async def handle_supplier_escalation(
    request: SupplierEscalationResponse,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Supplier responds to an AI escalation (price below floor, high value, etc.)."""
    lead_result = await db.execute(select(Lead).where(Lead.id == request.lead_id))
    lead = lead_result.scalar_one_or_none()
    if not lead or lead.supplier_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.ai_paused_for_supplier = False
    action = request.action.lower()

    if action == "accept":
        lead.status = "offer_ready"
        msg = f"Supplier approved this offer. Submitting final offer to buyer."
    elif action == "counter":
        price = request.counter_price
        lead.current_offer_price = price
        msg = f"Supplier countered at ₹{price}/unit. Agent resuming negotiation."
    elif action == "hold":
        msg = "Supplier is holding firm at current price. Agent notified."
    elif action == "decline":
        lead.status = "declined"
        msg = "Supplier has declined this requirement."
    else:
        raise HTTPException(status_code=400, detail="Unknown action")

    await _post_system_message(lead.id, msg, db)
    await db.flush()

    return {"success": True, "action": action, "lead_id": lead.id}


# ──────────────────────────── Internal helpers ────────────────────────────

async def _trigger_supplier_ai_response(
    conversation: Conversation,
    lead: Lead,
    buyer_message: str,
    db: AsyncSession,
) -> Message | None:
    """Generate and save supplier's AI response to buyer's message."""
    supplier_profile_result = await db.execute(
        select(AgenticProfile).where(AgenticProfile.user_id == lead.supplier_id)
    )
    supplier_profile = supplier_profile_result.scalar_one_or_none()
    if not supplier_profile:
        return None

    history = conversation.ai_context or []
    agent_config = supplier_profile.agent_config or get_default_agent_config()

    # Load supplier's config for agent context
    supplier_cfg = await get_or_create_config(lead.supplier_id, db)

    response = await supplier_agent_respond(
        conversation_history=history,
        buyer_message=buyer_message,
        supplier_profile={"trade_name": supplier_profile.trade_name,
                          "product_categories": supplier_profile.product_categories},
        agent_config=agent_config,
        negotiation_round=lead.negotiation_round,
        max_rounds=lead.max_negotiation_rounds,
        profile_md=supplier_cfg.profile_md or "",
        seller_settings_md=supplier_cfg.seller_settings_md or "",
    )

    msg = Message(
        conversation_id=conversation.id,
        role="ai_supplier",
        message_type="text",
        content=response["message"],
        structured_data={"offer": response.get("extracted_offer")},
    )
    db.add(msg)

    # Update lead
    if response.get("extracted_offer"):
        lead.current_offer_price = response["extracted_offer"].get("price_per_unit")
        lead.current_lead_time = response["extracted_offer"].get("lead_time_days")
    if response.get("needs_supplier_input"):
        lead.ai_paused_for_supplier = True
    lead.negotiation_round += 1

    # Update AI context
    updated_context = history + [
        {"role": "human_buyer", "content": buyer_message},
        {"role": "ai_supplier", "content": response["message"]},
    ]
    conversation.ai_context = updated_context

    return msg


async def _trigger_buyer_ai_response(
    conversation: Conversation,
    lead: Lead,
    supplier_message: str,
    db: AsyncSession,
) -> Message | None:
    """Generate and save buyer's AI response to supplier's message."""
    req_result = await db.execute(
        select(Requirement).where(Requirement.id == lead.requirement_id)
    )
    requirement = req_result.scalar_one_or_none()
    if not requirement:
        return None

    req_dict = {
        "product": requirement.product,
        "quantity": requirement.quantity,
        "budget_max": requirement.budget_max,
        "delivery_days": requirement.delivery_days,
        "delivery_location": requirement.delivery_location,
    }

    history = conversation.ai_context or []

    # Load buyer's config for agent context
    buyer_cfg = await get_or_create_config(lead.buyer_id, db)

    response = await buyer_agent_respond(
        conversation_history=history,
        supplier_message=supplier_message,
        requirement=req_dict,
        negotiation_round=lead.negotiation_round,
        max_rounds=lead.max_negotiation_rounds,
        profile_md=buyer_cfg.profile_md or "",
        buyer_settings_md=buyer_cfg.buyer_settings_md or "",
    )

    msg = Message(
        conversation_id=conversation.id,
        role="ai_buyer",
        message_type="text",
        content=response["message"],
        structured_data={"offer": response.get("extracted_offer")},
    )
    db.add(msg)

    if response.get("needs_buyer_input"):
        lead.ai_paused_for_buyer = True
    if response.get("is_deal_ready"):
        lead.status = "offer_ready"
    lead.negotiation_round += 1

    updated_context = history + [
        {"role": "ai_supplier", "content": supplier_message},
        {"role": "ai_buyer", "content": response["message"]},
    ]
    conversation.ai_context = updated_context

    return msg


async def _post_system_message(lead_id: int, content: str, db: AsyncSession):
    """Post a system notification message to the conversation."""
    conv_result = await db.execute(select(Conversation).where(Conversation.lead_id == lead_id))
    conversation = conv_result.scalar_one_or_none()
    if not conversation:
        return
    msg = Message(
        conversation_id=conversation.id,
        role="system",
        message_type="system_event",
        content=content,
    )
    db.add(msg)


async def _create_deal(lead: Lead, db: AsyncSession):
    """Create a Deal record when buyer accepts."""
    from app.models.deal import Deal
    req_result = await db.execute(
        select(Requirement).where(Requirement.id == lead.requirement_id)
    )
    req = req_result.scalar_one_or_none()
    if not req:
        return

    total = (lead.current_offer_price or 0) * req.quantity
    deal = Deal(
        lead_id=lead.id,
        buyer_id=lead.buyer_id,
        supplier_id=lead.supplier_id,
        product=req.product,
        quantity=req.quantity,
        quantity_unit=req.quantity_unit,
        final_price_per_unit=lead.current_offer_price or 0,
        total_value=total,
        lead_time_days=lead.current_lead_time,
        delivery_location=req.delivery_location,
        status="confirmed",
        buyer_savings=max(0, (req.budget_max - (lead.current_offer_price or 0)) * req.quantity),
    )
    db.add(deal)