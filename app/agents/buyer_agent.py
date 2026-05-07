"""
Buyer Agent — Human-like B2B procurement agent representing the buyer.
Reads full buyer profile + settings. Negotiates naturally to get best price.
Conversations flow like real business discussions — answer questions, negotiate, close.
"""
import json
import re
from typing import Optional
from app.agents.bedrock_client import call_qwen3
from app.agents.config_agent import build_agent_system_prompt


BUYER_AGENT_SYSTEM = """You are an experienced B2B procurement executive negotiating on behalf of your company.

ABOUT YOUR COMPANY (BUYER):
{profile_md}

YOUR PROCUREMENT SETTINGS & PRIORITIES:
{buyer_settings_md}

THE REQUIREMENT YOU'RE SOURCING:
- Product: {product}
- Quantity: {quantity} {qty_unit}
- Budget ceiling: ₹{budget_max}/unit (NEVER reveal this exact number to supplier)
- Delivery location: {delivery_location}
- Delivery deadline: {delivery_days} days
- Specifications: {specifications}

YOUR PERSONALITY & STYLE:
- Professional, direct, and strategic — you know what you want
- You respond naturally to what the supplier says — answer their questions helpfully
- You share relevant context about your need when it helps move things forward
- You push back on price but stay respectful — this is a long-term relationship
- You recognize quality and are willing to pay fair value — but always try for better
- Keep responses concise (2-5 sentences max)
- Natural language — "That's higher than what we had in mind", "We appreciate the offer but..."

CONVERSATION FLOW (follow this strictly):
Phase 1 — ANSWERING QUESTIONS:
  - When supplier asks about your requirements, answer clearly and helpfully
  - Provide specifics: sizes, colors, material preference, timeline
  - Don't volunteer budget — answer what's asked
  - Be cooperative — you WANT a good quote from them

Phase 2 — EVALUATING OFFERS:
  - When supplier quotes a price, compare to your budget ceiling internally
  - If price ≤ budget: negotiate 5-10% lower anyway (don't accept first offer)
  - If price is 1-10% above budget: counter firmly but stay engaged
  - If price is 10-20% above: push hard, suggest alternatives
  - If price is >20% above: express concern, ask what can change to bring cost down

Phase 3 — NEGOTIATION:
  - Use these levers: volume commitment, quick payment, repeat orders, flexibility on specs
  - Counter with a specific number — don't just say "lower please"
  - Maximum 3-4 counter rounds before deciding
  - If supplier holds firm at a reasonable price (within 5% of budget), accept

Phase 4 — CLOSING:
  - When terms are acceptable, signal clearly: "That works for us. Let's proceed."
  - Confirm: quantity, price, delivery timeline, payment terms
  - Ask about next steps (samples, PO, advance payment)

ACCEPTANCE SIGNALS (use one of these when deal is good):
- "That works for us. Let's proceed."
- "Agreed on those terms. Please share next steps."
- "We'll take it at that price. How do we proceed?"

WALK-AWAY SIGNALS (when supplier won't budge and price is too high):
- "I appreciate your time, but this doesn't fit our budget. We'll look at other options."
- Only walk away after 3+ rounds of negotiation with no movement

IMPORTANT RULES:
- NEVER reveal your exact budget ceiling (₹{budget_max})
- Always answer supplier's questions — don't dodge or deflect
- When price is quoted, always respond with your position (accept/counter/ask questions)
- Don't bring up topics the supplier hasn't raised yet — stay responsive
- If supplier asks about urgency/timeline, be honest about your deadline

Remember: You're protecting your company's budget while building a good supplier relationship."""


async def generate_buyer_opener(
    requirement: dict,
    supplier_profile: dict,
    profile_md: str = "",
    buyer_settings_md: str = "",
) -> dict:
    """Generate buyer's opening inquiry to the supplier."""

    product = requirement.get("product", "product")
    quantity = requirement.get("quantity", "")
    qty_unit = requirement.get("quantity_unit", "units")
    budget_max = requirement.get("budget_max", "")
    delivery_location = requirement.get("delivery_location", "")
    delivery_days = requirement.get("delivery_days", "")
    specs = requirement.get("specifications") or {}

    system = BUYER_AGENT_SYSTEM.format(
        profile_md=profile_md or "B2B buyer looking for quality products at competitive prices.",
        buyer_settings_md=buyer_settings_md or "Standard procurement — quality and price balanced.",
        product=product,
        quantity=quantity,
        qty_unit=qty_unit,
        budget_max=budget_max,
        delivery_location=delivery_location,
        delivery_days=delivery_days or "flexible",
        specifications=json.dumps(specs) if specs else "Standard quality",
    )

    trade_name = supplier_profile.get("trade_name", "your company")

    prompt = f"""You are reaching out to {trade_name} about your requirement.

Write a professional opening message:
- Briefly introduce yourself/your company (1 sentence)
- State what you need: {product}, {quantity} {qty_unit}
- Mention key specs if any: {json.dumps(specs) if specs else "standard quality"}
- Mention delivery to {delivery_location}
- Ask for their best offer (price, lead time, payment terms)
- Keep it concise — 3-4 sentences
- Do NOT reveal your budget ceiling"""

    messages = [{"role": "user", "content": [{"text": prompt}]}]
    response = await call_qwen3(messages, system_prompt=system, max_tokens=250, temperature=0.7)

    return {"message": response, "needs_buyer_input": False}


async def buyer_agent_respond(
    conversation_history: list,
    supplier_message: str,
    requirement: dict,
    negotiation_round: int,
    max_rounds: int = 999,
    profile_md: str = "",
    buyer_settings_md: str = "",
) -> dict:
    """
    Generate buyer's natural response to supplier's message.
    Answers questions, negotiates strategically, closes when terms are good.
    """
    product = requirement.get("product", "product")
    quantity = requirement.get("quantity", "")
    qty_unit = requirement.get("quantity_unit", "units")
    budget_max = requirement.get("budget_max", 0)
    delivery_location = requirement.get("delivery_location", "")
    delivery_days = requirement.get("delivery_days", "")
    specs = requirement.get("specifications") or {}

    system = BUYER_AGENT_SYSTEM.format(
        profile_md=profile_md or "B2B buyer looking for quality products at competitive prices.",
        buyer_settings_md=buyer_settings_md or "Standard procurement — quality and price balanced.",
        product=product,
        quantity=quantity,
        qty_unit=qty_unit,
        budget_max=budget_max,
        delivery_location=delivery_location,
        delivery_days=delivery_days or "flexible",
        specifications=json.dumps(specs) if specs else "Standard quality",
    )

    # Build conversation history
    messages = []
    for msg in conversation_history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role in ("ai_supplier", "assistant"):
            messages.append({"role": "user", "content": [{"text": content}]})
        elif role in ("ai_buyer", "human_buyer", "user"):
            messages.append({"role": "assistant", "content": [{"text": content}]})

    # Current supplier message with context
    round_context = ""
    if negotiation_round >= 5:
        round_context = "\n[Note: You've been negotiating for several rounds. Make a decision soon — accept if terms are reasonable, or walk away if they won't budge.]"

    messages.append({
        "role": "user",
        "content": [{"text": f"{supplier_message}{round_context}"}]
    })

    response = await call_qwen3(
        messages,
        system_prompt=system,
        max_tokens=350,
        temperature=0.7,
    )

    # Detect if buyer is accepting
    is_accepting = _detect_acceptance(response)
    is_walking_away = _detect_walkaway(response)
    needs_input = "<NEEDS_BUYER_INPUT" in response

    extracted_offer = _extract_counter_offer(response)

    input_reason = ""
    if needs_input:
        try:
            start = response.index('reason="') + 8
            end = response.index('"', start)
            input_reason = response[start:end]
        except ValueError:
            input_reason = "Needs your decision"

    clean = response
    if "<NEEDS_BUYER_INPUT" in clean:
        clean = clean[:clean.index("<NEEDS_BUYER_INPUT")].strip()

    return {
        "message": clean or response,
        "needs_buyer_input": needs_input,
        "buyer_input_reason": input_reason,
        "extracted_offer": extracted_offer,
        "is_deal_ready": is_accepting,
        "is_walking_away": is_walking_away,
    }


def _detect_acceptance(message: str) -> bool:
    keywords = [
        "let's proceed", "agreed", "that works", "we accept", "confirm the order",
        "deal done", "go ahead", "approved", "we're happy with", "finaliz",
        "we'll take it", "please proceed", "works for us", "we agree to",
        "let's move forward", "we can proceed",
    ]
    return any(kw in message.lower() for kw in keywords)


def _detect_walkaway(message: str) -> bool:
    keywords = [
        "look at other options", "doesn't fit our budget", "we'll pass",
        "not going to work", "can't proceed at this price", "too expensive for us",
        "we'll have to decline",
    ]
    return any(kw in message.lower() for kw in keywords)


def _extract_counter_offer(text: str) -> dict | None:
    """Extract if buyer is proposing a specific counter price."""
    price_patterns = [
        r'₹\s*([\d,]+(?:\.\d+)?)\s*(?:per\s*piece|per\s*unit|/piece|/unit)',
        r'([\d,]+(?:\.\d+)?)\s*(?:per\s*piece|per\s*unit|/piece|/unit)',
    ]
    for pattern in price_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            price_str = match.group(1).replace(",", "")
            try:
                return {"price_per_unit": float(price_str)}
            except ValueError:
                pass
    return None
