"""
Buyer Agent — Human-like B2B procurement agent representing the buyer.
Reads full buyer profile + settings. Negotiates naturally to get best price.
One response at a time. Strategic. Pushes back. Closes when terms are good.
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

YOUR PERSONALITY & STYLE:
- Professional, direct, and strategic — you know what you want
- You respond naturally to what the supplier says — one focused response at a time
- You share relevant context about your need when it helps the negotiation
- You push back on price but don't be rude — this is a long-term relationship
- You recognize quality and are willing to pay fair value — but always try for better
- Natural language — "That's higher than what we had in mind", "We appreciate the offer but..."

NEGOTIATION STRATEGY:
- Always try to get 5-10% below the quoted price at minimum
- Use logic: volume, quick payment, repeat business as leverage
- If price is within 5% of budget, consider accepting after 1-2 rounds
- If price is way above budget, counter firmly or walk away after 2 attempts
- Ask about delivery, quality, samples, certifications when relevant
- Never reveal your exact budget ceiling

RESPONSE RULES:
- Respond directly to what the supplier just said
- If they asked a question, answer it AND move negotiation forward
- If they quoted a price, counter or accept based on your settings
- Keep responses concise and natural — like a real business conversation
- When you're happy with the terms, signal acceptance clearly

ACCEPTANCE SIGNAL (when deal is good):
Say something like: "That works for us. Let's proceed." or "Agreed on those terms."

Remember: You're protecting your company's procurement budget while building a good supplier relationship."""


async def generate_buyer_opener(
    requirement: dict,
    supplier_profile: dict,
    profile_md: str = "",
    buyer_settings_md: str = "",
) -> dict:
    """Generate buyer's opening inquiry to the supplier."""

    system = BUYER_AGENT_SYSTEM.format(
        profile_md=profile_md or "B2B buyer looking for quality products at competitive prices.",
        buyer_settings_md=buyer_settings_md or "Standard procurement — quality and price balanced.",
    )

    trade_name = supplier_profile.get("trade_name", "your company")
    product = requirement.get("product", "product")
    quantity = requirement.get("quantity", "")
    qty_unit = requirement.get("quantity_unit", "units")
    budget = requirement.get("budget_max", "")
    delivery_location = requirement.get("delivery_location", "")
    specs = requirement.get("specifications") or {}

    prompt = f"""You are reaching out to {trade_name} about this requirement:

Product: {product}
Quantity: {quantity} {qty_unit}
Delivery: {delivery_location}
Specifications: {json.dumps(specs) if specs else "Standard quality"}

Write a professional opening message to this supplier.
- Briefly introduce yourself/your company
- State your requirement clearly
- Ask for their best offer (price, lead time, payment terms)
- Keep it concise and professional — 3-4 sentences
- Don't reveal your budget ceiling"""

    messages = [{"role": "user", "content": [{"text": prompt}]}]
    response = await call_qwen3(messages, system_prompt=system, max_tokens=300, temperature=0.7)

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
    Negotiates strategically. Pushes back on price. Closes when terms are good.
    """
    system = BUYER_AGENT_SYSTEM.format(
        profile_md=profile_md or "B2B buyer looking for quality products at competitive prices.",
        buyer_settings_md=buyer_settings_md or "Standard procurement — quality and price balanced.",
    )

    budget_max = requirement.get("budget_max", 0)
    product = requirement.get("product", "product")
    quantity = requirement.get("quantity", "")

    # Build conversation history
    messages = []
    for msg in conversation_history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role in ("ai_supplier", "assistant"):
            messages.append({"role": "user", "content": [{"text": content}]})
        elif role in ("ai_buyer", "human_buyer", "user"):
            messages.append({"role": "assistant", "content": [{"text": content}]})

    # Current supplier message
    context = f"""The supplier just said: "{supplier_message}"

Your requirement context:
- Product: {product}
- Quantity: {quantity}
- Your budget ceiling: ₹{budget_max}/unit (don't reveal this exact number)
- Round: {negotiation_round}

Respond naturally to what they said. If they gave a price, counter or accept based on how it compares to your budget.
If they asked a question, answer it and keep negotiation moving forward."""

    messages.append({"role": "user", "content": [{"text": context}]})

    response = await call_qwen3(
        messages,
        system_prompt=system,
        max_tokens=400,
        temperature=0.75,
    )

    # Detect if buyer is accepting
    is_accepting = _detect_acceptance(response)
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
    }


def _detect_acceptance(message: str) -> bool:
    keywords = [
        "let's proceed", "agreed", "that works", "we accept", "confirm",
        "deal done", "go ahead", "approved", "we're happy", "finaliz",
        "we'll take it", "please proceed", "works for us"
    ]
    return any(kw in message.lower() for kw in keywords)


def _extract_counter_offer(text: str) -> dict | None:
    """Extract if buyer is proposing a specific counter price."""
    price_patterns = [
        r'₹(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:per\s*piece|per\s*unit|\/piece|\/unit)',
        r'(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:per\s*piece|per\s*unit|\/piece|\/unit)',
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