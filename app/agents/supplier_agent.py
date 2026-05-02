"""
Supplier Agent — Human-like B2B sales agent representing the supplier.
Reads full seller profile + settings to negotiate naturally.
One question at a time. Builds context. Closes deals like a real salesperson.
"""
import json
import re
from typing import Optional
from app.agents.bedrock_client import call_qwen3
from app.agents.config_agent import build_agent_system_prompt


SUPPLIER_AGENT_SYSTEM = """You are an experienced B2B sales executive representing {trade_name}, based in {location}.

ABOUT YOUR COMPANY:
{profile_md}

YOUR SALES SETTINGS & PRICING:
{seller_settings_md}

YOUR PERSONALITY & STYLE:
- You are warm, professional, and genuinely helpful — like a real salesperson who wants repeat business
- You ask ONE focused question at a time — never bombard the buyer with multiple questions
- You listen carefully and build on what the buyer tells you
- You know your products inside out and can recommend the right option
- You share useful knowledge (fabric types, GSM, printing methods) when it helps the buyer decide
- You speak naturally — not like a robot. Use phrases like "That's a great choice", "I understand", "Let me be transparent with you"
- You match the buyer's language and communication style

NEGOTIATION RULES:
- Start with your target price (not floor price) — leave room to negotiate
- When buyer counters, either: hold firm with a good reason, offer a small discount, or offer value-add (faster delivery, better payment terms, free samples)
- NEVER go below your floor price from settings
- If price below floor: explain why you can't go lower and offer alternatives
- Volume discounts: apply automatically based on your settings
- Be honest about timelines — never overpromise

OFFER FORMAT (include when quoting price):
<OFFER price_per_unit="X" quantity="Y" lead_time_days="Z" payment_terms="..." />

ESCALATE TO HUMAN when:
- Order value exceeds your escalation threshold
- Buyer requests something outside your catalog
- You cannot commit to their deadline
Use: <NEEDS_SUPPLIER_INPUT reason="..." />

CONVERSATION FLOW:
1. Greet warmly, acknowledge their requirement
2. Ask the most important missing detail (one question only)
3. Once you have enough info, give a clear quote
4. Handle objections naturally — negotiate like a human
5. Close the deal or escalate when needed

Remember: You represent {trade_name}. Be proud of your products. Build trust. Win the deal."""


async def generate_supplier_opener(
    requirement: dict,
    supplier_profile: dict,
    agent_config: dict,
    profile_md: str = "",
    seller_settings_md: str = "",
) -> dict:
    """Generate the supplier's opening message — warm, natural, human-like."""

    trade_name = supplier_profile.get("trade_name", "our company")
    location = f"{supplier_profile.get('city', '')}, {supplier_profile.get('state', 'India')}".strip(", ")

    system = SUPPLIER_AGENT_SYSTEM.format(
        trade_name=trade_name,
        location=location,
        profile_md=profile_md or f"Supplier: {trade_name}, Location: {location}",
        seller_settings_md=seller_settings_md or "Standard negotiation — professional and balanced.",
    )

    product = requirement.get("product", "your product")
    quantity = requirement.get("quantity", "")
    qty_unit = requirement.get("quantity_unit", "units")
    budget = requirement.get("budget_max", "")
    location_delivery = requirement.get("delivery_location", "")

    prompt = f"""A buyer has just posted this requirement and you've been matched:

Product: {product}
Quantity: {quantity} {qty_unit}
Budget: ₹{budget}/unit (max)
Delivery Location: {location_delivery}
Additional details: {json.dumps(requirement.get("specifications") or {}, indent=2)}

Write your opening message to the buyer. 
- Greet them warmly and introduce yourself/your company briefly
- Confirm you can fulfill their requirement
- Ask the ONE most important question you need to give them a proper quote
- Be natural and conversational — like a real salesperson would open
- Keep it concise (3-5 sentences max)
- Include <OFFER .../> only if you already have enough info to quote confidently"""

    messages = [{"role": "user", "content": [{"text": prompt}]}]
    response = await call_qwen3(messages, system_prompt=system, max_tokens=350, temperature=0.75)

    extracted_offer = _extract_offer(response)

    return {
        "message": response,
        "extracted_offer": extracted_offer,
        "needs_supplier_input": False,
    }


async def supplier_agent_respond(
    conversation_history: list,
    buyer_message: str,
    supplier_profile: dict,
    agent_config: dict,
    negotiation_round: int,
    max_rounds: int = 999,
    profile_md: str = "",
    seller_settings_md: str = "",
) -> dict:
    """
    Generate supplier's natural, human-like response to buyer's message.
    Reads full company profile and settings. One question at a time.
    """
    trade_name = supplier_profile.get("trade_name", "our company")
    location = f"{supplier_profile.get('city', '')}, {supplier_profile.get('state', 'India')}".strip(", ")

    system = SUPPLIER_AGENT_SYSTEM.format(
        trade_name=trade_name,
        location=location,
        profile_md=profile_md or f"Supplier: {trade_name}, Location: {location}",
        seller_settings_md=seller_settings_md or "Standard negotiation — professional and balanced.",
    )

    # Build conversation history for context
    messages = []
    for msg in conversation_history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role in ("ai_buyer", "human_buyer", "user"):
            messages.append({"role": "user", "content": [{"text": content}]})
        elif role in ("ai_supplier", "assistant"):
            messages.append({"role": "assistant", "content": [{"text": content}]})

    # Add current buyer message
    messages.append({
        "role": "user",
        "content": [{"text": buyer_message}]
    })

    response = await call_qwen3(
        messages,
        system_prompt=system,
        max_tokens=500,
        temperature=0.75,
    )

    # Parse markers
    needs_input = "<NEEDS_SUPPLIER_INPUT" in response
    input_reason = ""
    if needs_input:
        try:
            start = response.index('reason="') + 8
            end = response.index('"', start)
            input_reason = response[start:end]
        except ValueError:
            input_reason = "This order needs your review"

    extracted_offer = _extract_offer(response)
    is_deal_closed = _detect_acceptance(buyer_message)

    # Clean markers from display message
    clean = response
    for tag in ["<NEEDS_SUPPLIER_INPUT", "<OFFER "]:
        if tag in clean:
            clean = clean[:clean.index(tag)].strip()

    return {
        "message": clean or response,
        "needs_supplier_input": needs_input,
        "supplier_input_reason": input_reason,
        "extracted_offer": extracted_offer,
        "is_deal_closed": is_deal_closed,
    }


def _extract_offer(text: str) -> dict | None:
    if "<OFFER " not in text:
        return None
    try:
        start = text.index("<OFFER ")
        end = text.index("/>", start) + 2
        offer_str = text[start:end]
        attrs = re.findall(r'(\w+)="([^"]*)"', offer_str)
        result = {}
        for key, val in attrs:
            try:
                result[key] = float(val) if "." in val else int(val)
            except ValueError:
                result[key] = val
        return result
    except Exception:
        return None


def _detect_acceptance(message: str) -> bool:
    keywords = ["accept", "confirm", "deal done", "we agree", "finaliz", "go ahead", "proceed", "approved", "perfect deal"]
    return any(kw in message.lower() for kw in keywords)


def get_default_agent_config() -> dict:
    return {
        "negotiation_style": "balanced",
        "max_rounds": 999,
        "auto_accept_score": 80,
        "auto_decline_score": 40,
        "escalation_order_value": 500000,
        "volume_discount_rules": [],
        "price_floors": {},
    }