"""General AI chat per requirement — buyer queries summaries, top sellers, etc."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.requirement import Requirement
from app.models.requirement_chat import RequirementChat
from app.models.lead import Lead
from app.agents.bedrock_client import call_qwen3
import json

router = APIRouter(prefix="/req-chat", tags=["Requirement Chat"])


class ReqChatMessage(BaseModel):
    requirement_id: int
    message: str


class ReqChatResponse(BaseModel):
    requirement_id: int
    reply: str
    messages: list


REQUIREMENT_ANALYST_SYSTEM = """You are Bisdom's Requirement Intelligence Assistant.
You help the buyer understand and manage a specific procurement requirement.
You have access to the requirement details and all matched supplier leads.

You can help with:
- Summarizing all seller negotiations so far
- Ranking sellers by best offer, lead time, reliability
- Answering questions about any specific seller
- Recommending which seller to accept
- Flagging concerns or anomalies
- Providing market insights

Always be concise and actionable. Format responses clearly.
Use ₹ for prices. Use Indian business terminology."""


async def build_requirement_context(req: Requirement, leads: list, db: AsyncSession) -> str:
    """Build a context string describing the requirement and all leads."""
    ctx = [
        f"REQUIREMENT #{req.id}",
        f"Product: {req.product}",
        f"Quantity: {req.quantity} {req.quantity_unit or 'units'}",
        f"Budget: ₹{req.budget_max} max",
        f"Delivery: {req.delivery_location or 'Not specified'} in {req.delivery_days or '?'} days",
        f"Status: {req.enrichment_status}",
        f"Posted: {req.created_at.strftime('%d %b %Y') if req.created_at else 'Unknown'}",
        "",
        f"MATCHED SELLERS ({len(leads)} total):",
    ]
    for i, lead in enumerate(leads, 1):
        ctx.append(
            f"  {i}. Lead #{lead.id} | Status: {lead.status} | "
            f"Offer: {'₹'+str(lead.current_offer_price) if lead.current_offer_price else 'Pending'} | "
            f"Lead time: {lead.current_lead_time or '?'}d | "
            f"Fit: {lead.fit_score or 0:.0f}% | "
            f"Round: {lead.negotiation_round}/{lead.max_negotiation_rounds}"
        )
    return "\n".join(ctx)


@router.post("/", response_model=ReqChatResponse)
async def requirement_chat(
    request: ReqChatMessage,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify requirement belongs to user
    req_result = await db.execute(
        select(Requirement).where(
            Requirement.id == request.requirement_id,
            Requirement.buyer_id == current_user.id,
        )
    )
    req = req_result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Requirement not found")

    # Get all leads for this requirement
    leads_result = await db.execute(
        select(Lead).where(Lead.requirement_id == request.requirement_id)
    )
    leads = leads_result.scalars().all()

    # Get or create chat record
    chat_result = await db.execute(
        select(RequirementChat).where(
            RequirementChat.requirement_id == request.requirement_id
        )
    )
    req_chat = chat_result.scalar_one_or_none()
    if not req_chat:
        req_chat = RequirementChat(
            requirement_id=request.requirement_id,
            buyer_id=current_user.id,
            messages=[],
        )
        db.add(req_chat)
        await db.flush()

    # Build context
    context = await build_requirement_context(req, leads, db)

    # Build messages for LLM
    history = req_chat.messages or []
    messages = []

    # Add context as first user message if no history
    if not history:
        messages.append({
            "role": "user",
            "content": f"Here is my current requirement data:\n\n{context}\n\nI'm ready to ask questions."
        })
        messages.append({
            "role": "assistant",
            "content": f"I have your requirement details loaded. You have {len(leads)} matched sellers. What would you like to know?"
        })

    # Add history
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Add current question with fresh context
    user_msg = f"[Current data snapshot]\n{context}\n\n[My question]\n{request.message}"
    messages.append({"role": "user", "content": user_msg})

    # Call AI
    reply = await call_qwen3(
        messages,
        system_prompt=REQUIREMENT_ANALYST_SYSTEM,
        max_tokens=600,
        temperature=0.6,
    )

    # Save to history (store clean version without context injection)
    updated_history = history + [
        {"role": "user", "content": request.message},
        {"role": "assistant", "content": reply},
    ]
    req_chat.messages = updated_history
    await db.flush()

    return ReqChatResponse(
        requirement_id=request.requirement_id,
        reply=reply,
        messages=updated_history[-20:],  # return last 20 messages
    )


@router.get("/{requirement_id}", response_model=ReqChatResponse)
async def get_requirement_chat(
    requirement_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_result = await db.execute(
        select(Requirement).where(
            Requirement.id == requirement_id,
            Requirement.buyer_id == current_user.id,
        )
    )
    if not req_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Requirement not found")

    chat_result = await db.execute(
        select(RequirementChat).where(RequirementChat.requirement_id == requirement_id)
    )
    req_chat = chat_result.scalar_one_or_none()
    messages = req_chat.messages if req_chat else []

    return ReqChatResponse(
        requirement_id=requirement_id,
        reply="",
        messages=messages,
    )
