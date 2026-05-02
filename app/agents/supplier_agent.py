from app.agents.config_agent import build_agent_system_prompt
"""
Supplier Agent — Autonomous negotiation agent representing the supplier.
Evaluates incoming match signals, prepares opening offers, negotiates with
buyer agents, and escalates to human supplier when needed.
"""
import json
from typing import Optional
from app.agents.bedrock_client import call_qwen3


SUPPLIER_AGENT_SYSTEM = """You are Bisdom's AI Supplier Agent — an autonomous negotiation agent
representing an Indian SME supplier in B2B negotiations.

Your mandate:
- Represent the supplier's interest to close deals at good margins
- Never go below the supplier's price floor
- Be professional and responsive — good communication wins deals
- Close deals efficiently — don't drag negotiations

Supplier Profile:
{supplier_profile_json}

Agent Configuration:
{agent_config_json}

Rules:
- Opening offer: start at preferred price or slightly above
- Conservative mode: minimal concession, hold price for longer
- Balanced mode: 2-3 rounds, reasonable concessions
- Aggressive mode: make concessions faster to win the deal
- NEVER go below floor price
- If buyer asks below floor, say: <NEEDS_SUPPLIER_INPUT reason="Price below floor — ₹X requested vs ₹Y floor">
- If order value > escalation threshold, say: <NEEDS_SUPPLIER_INPUT reason="High value order needs your approval">
- When making offer: <OFFER price_per_unit="X" quantity="Y" lead_time_days="Z" payment_terms="..." />

Keep responses professional, concise, and business-like."""


async def evaluate_match_signal(
    requirement: dict,
    supplier_profile: dict,
    agent_config: dict,
) -> dict:
    """
    Evaluate if supplier should respond to this buyer requirement.

    Returns:
    {
        "should_initiate": bool,
        "fit_score": float,
        "decline_reason": str or None,
        "needs_human_approval": bool,
    }
    """
    prompt = f"""Evaluate if this supplier should respond to this buyer requirement.

Supplier Profile:
{json.dumps(supplier_profile, indent=2)}

Agent Config (price floors, MOQ, etc.):
{json.dumps(agent_config, indent=2)}

Buyer Requirement:
{json.dumps(requirement, indent=2)}

Score the fit 0-100 and decide:
- Above 65: initiate conversation
- 40-65: borderline — flag for human approval
- Below 40: decline silently

Return JSON:
{{
  "fit_score": 82,
  "should_initiate": true,
  "needs_human_approval": false,
  "decline_reason": null,
  "match_reasons": ["Product match: Cotton T-Shirts", "Price range compatible", "Location serviceable"]
}}"""

    messages = [{"role": "user", "content": [{"text": prompt}]}]
    system = "You are a B2B commerce matching engine. Return only valid JSON."

    try:
        response = await call_qwen3(messages, system_prompt=system, max_tokens=512)
        cleaned = response.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        return json.loads(cleaned)
    except Exception:
        return {
            "fit_score": 0,
            "should_initiate": False,
            "needs_human_approval": False,
            "decline_reason": "Evaluation failed",
            "match_reasons": [],
        }


async def generate_supplier_opener(
    requirement: dict,
    supplier_profile: dict,
    agent_config: dict,
    profile_md: str = "",
    seller_settings_md: str = "",
) -> dict:
    """Generate the supplier's opening offer message to the buyer's agent."""
    base_system = SUPPLIER_AGENT_SYSTEM.format(
        supplier_profile_json=json.dumps(supplier_profile, indent=2),
        agent_config_json=json.dumps(agent_config, indent=2),
    )
    system = build_agent_system_prompt(base_system, profile_md, seller_settings_md)

    prompt = f"""A buyer has posted this requirement and you've been matched:
{json.dumps(requirement, indent=2)}

Generate a professional opening response with your best offer.
Include product availability confirmation, your price, lead time, and payment terms.
End with the <OFFER .../> tag."""

    messages = [{"role": "user", "content": [{"text": prompt}]}]
    response = await call_qwen3(messages, system_prompt=system, max_tokens=400, temperature=0.6)

    return {"message": response, "needs_supplier_input": False}


async def supplier_agent_respond(
    conversation_history: list,
    buyer_message: str,
    supplier_profile: dict,
    agent_config: dict,
    negotiation_round: int,
    max_rounds: int = 5,
    profile_md: str = "",
    seller_settings_md: str = "",
) -> dict:
    """
    Generate supplier agent's response to buyer's message/counter-offer.

    Returns:
    {
        "message": str,
        "needs_supplier_input": bool,
        "supplier_input_reason": str,
        "extracted_offer": dict or None,
        "is_deal_closed": bool,
    }
    """
    base_system = SUPPLIER_AGENT_SYSTEM.format(
        supplier_profile_json=json.dumps(supplier_profile, indent=2),
        agent_config_json=json.dumps(agent_config, indent=2),
    )
    system = build_agent_system_prompt(base_system, profile_md, seller_settings_md)

    context = f"[Round {negotiation_round} of {max_rounds}]"

    messages = []
    for msg in conversation_history:
        role = "user" if msg["role"] in ("ai_buyer", "human_buyer") else "assistant"
        messages.append({"role": role, "content": [{"text": msg["content"]}]})
    messages.append({"role": "user", "content": [{"text": f"{context}\nBuyer: {buyer_message}"}]})

    response = await call_qwen3(messages, system_prompt=system, max_tokens=512, temperature=0.6)

    # Parse special markers
    needs_input = "<NEEDS_SUPPLIER_INPUT" in response
    input_reason = ""
    if needs_input:
        try:
            start = response.index('reason="') + 8
            end = response.index('"', start)
            input_reason = response[start:end]
        except ValueError:
            input_reason = "This order needs your review before proceeding"

    # Extract offer
    extracted_offer = None
    is_deal_closed = False
    if "<OFFER " in response:
        try:
            offer_str = response[response.index("<OFFER "):response.index("/>", response.index("<OFFER ")) + 2]
            extracted_offer = _parse_offer_tag(offer_str)
        except Exception:
            pass

    # Check if buyer accepted (detect acceptance language)
    acceptance_keywords = ["accept", "confirm", "deal confirmed", "we accept", "agreed"]
    if any(kw in buyer_message.lower() for kw in acceptance_keywords):
        is_deal_closed = True

    # Clean message
    clean_message = response
    for marker in ["<NEEDS_SUPPLIER_INPUT", "<OFFER ", "/>"]:
        if marker in clean_message:
            clean_message = clean_message[:clean_message.index(marker)].strip()

    return {
        "message": clean_message or response,
        "needs_supplier_input": needs_input,
        "supplier_input_reason": input_reason,
        "extracted_offer": extracted_offer,
        "is_deal_closed": is_deal_closed,
    }


def get_default_agent_config() -> dict:
    """Default agent config for new suppliers."""
    return {
        "negotiation_style": "balanced",
        "max_rounds": 5,
        "auto_accept_score": 80,
        "auto_decline_score": 40,
        "escalation_order_value": 500000,  # INR 5 lakhs
        "volume_discount_rules": [],
        "price_floors": {},  # populated from supplier catalog
    }


def _parse_offer_tag(offer_str: str) -> dict:
    import re
    attrs = re.findall(r'(\w+)="([^"]*)"', offer_str)
    result = {}
    for key, val in attrs:
        try:
            result[key] = float(val) if "." in val else int(val)
        except ValueError:
            result[key] = val
    return result