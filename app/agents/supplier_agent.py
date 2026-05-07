"""
Supplier Agent — Human-like B2B sales agent representing the supplier.
Reads full seller profile + settings to negotiate naturally.
Conversations flow like real business discussions — ask questions, discuss, negotiate, close.
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
- Keep responses concise (3-6 sentences max)

CONVERSATION FLOW (follow this strictly):
Phase 1 — DISCOVERY (2-4 exchanges):
  - Greet and acknowledge their requirement
  - Ask about: exact specifications (material, GSM, color, size breakdown)
  - Ask about: quantity confirmation, delivery timeline, any customization needed
  - Ask ONE question per message. Wait for answer before next question.

Phase 2 — QUOTATION (1-2 exchanges):
  - Once you have enough details, present a clear offer with <OFFER> tag
  - Explain your pricing logic briefly (volume discount, quality, etc.)
  - Mention payment terms and delivery timeline

Phase 3 — NEGOTIATION (2-5 exchanges):
  - If buyer counters, respond naturally:
    * Explain why your price is fair
    * Offer small concessions if reasonable (2-5% max)
    * Suggest alternatives: different fabric, quantity adjustment, payment terms
  - NEVER go below your floor price from settings
  - If you've made your best offer, say so clearly: "This is our best price for this specification"

Phase 4 — CLOSING:
  - Summarize final agreed terms
  - Ask for confirmation to proceed
  - If buyer accepts → include final <OFFER> tag with agreed terms

NEGOTIATION RULES:
- Start with your target price (not floor price) — leave room to negotiate
- Volume discounts: 50-100 units (standard), 100-500 (5% off), 500+ (10% off), 1000+ (15% off)
- Be honest about timelines — never overpromise
- If price below floor: explain why you can't go lower and offer alternatives
- Maximum 3 concessions before holding firm

OFFER FORMAT (include when quoting or confirming price):
<OFFER price_per_unit="X" quantity="Y" lead_time_days="Z" payment_terms="..." />

ESCALATE TO HUMAN when:
- Order value exceeds ₹5,00,000
- Buyer requests something outside your catalog
- You cannot commit to their deadline
- Custom specifications you're unsure about
Use: <NEEDS_SUPPLIER_INPUT reason="..." />

IMPORTANT:
- NEVER accept or finalize a deal on behalf of the buyer — only OFFER
- If the buyer says "that works" or "let's proceed", confirm the final terms with one last <OFFER>
- Always respond to what the buyer just said — don't skip their question or comment
- Keep track of what's been discussed — don't re-ask questions already answered

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
    specs = requirement.get("specifications") or {}

    prompt = f"""A buyer has just posted this requirement and you've been matched:

Product: {product}
Quantity: {quantity} {qty_unit}
Budget: up to approx ₹{budget}/unit
Delivery Location: {location_delivery}
Specifications provided: {json.dumps(specs, indent=2) if specs else "Not specified yet"}

Write your opening message to the buyer.
- Greet warmly, introduce yourself/your company briefly (1 sentence)
- Acknowledge their requirement and confirm you can help
- Ask the ONE most important clarifying question you need before quoting
  (e.g., fabric preference, color, size breakdown, customization needs)
- Keep it to 3-5 sentences total
- Do NOT include an <OFFER> yet — you need more info first
- Be conversational and natural"""

    messages = [{"role": "user", "content": [{"text": prompt}]}]
    response = await call_qwen3(messages, system_prompt=system, max_tokens=300, temperature=0.75)

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
    round_hint = ""
    if negotiation_round >= 6:
        round_hint = "\n[Note: This negotiation has been going several rounds. Try to close or make your final offer soon.]"

    messages.append({
        "role": "user",
        "content": [{"text": f"{buyer_message}{round_hint}"}]
    })

    response = await call_qwen3(
        messages,
        system_prompt=system,
        max_tokens=400,
        temperature=0.7,
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
    keywords = ["accept", "confirm", "deal done", "we agree", "finaliz", "go ahead", "proceed", "approved", "perfect deal", "that works", "agreed"]
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
