from app.agents.config_agent import build_agent_system_prompt
"""
Buyer Agent — Autonomous negotiation agent representing the buyer.
Initiates conversations with matched suppliers, negotiates price/terms,
handles human-in-the-loop escalations, and prepares comparison tables.
"""
import json
from typing import Optional
from app.agents.bedrock_client import call_qwen3


BUYER_AGENT_SYSTEM = """You are Bisdom's AI Buyer Agent — an autonomous negotiation agent
representing an Indian SME buyer. You negotiate B2B procurement deals professionally.

Your mandate:
- Represent the buyer's interest to get the best price, lead time, and terms
- Be professional and respectful — this is B2B commerce in India
- Negotiate firmly but fairly — don't insult suppliers
- Compare all offers and push for better terms

Current buyer requirement:
{requirement_json}

Negotiation rules:
- Start by introducing the requirement clearly and professionally
- Always push for price at or below the buyer's budget_max
- If supplier price is close (within 10%), acknowledge and ask for small improvement
- If supplier price is much higher (>20%), counter firmly with buyer's target
- Maximum {max_rounds} negotiation rounds
- If you need buyer's input (unusual MOQ, tradeoffs), say: <NEEDS_BUYER_INPUT reason="...">

When making an offer or counter, use this format at the end of your message:
<OFFER price_per_unit="X" quantity="Y" lead_time_days="Z" payment_terms="..." />

Be concise. Indian B2B communication is direct and efficient."""


BUYER_AGENT_OPENER = """You are initiating a conversation with a matched supplier.
Write a professional opening message introducing this procurement requirement.
Be specific about the requirement details. Ask for their best offer.

Keep it under 100 words. Professional and direct."""


async def generate_buyer_opener(requirement: dict, supplier_profile: dict) -> dict:
    """Generate the opening message from buyer's AI agent to supplier's AI agent."""
    prompt = f"""Buyer Requirement:
{json.dumps(requirement, indent=2)}

Supplier Profile:
- Name: {supplier_profile.get('trade_name', 'Supplier')}
- Products: {', '.join(supplier_profile.get('product_categories', []))}
- Location: {supplier_profile.get('city', '')}, {supplier_profile.get('state', '')}

Generate the opening procurement inquiry message."""

    messages = [{"role": "user", "content": [{"text": prompt}]}]
    system = BUYER_AGENT_SYSTEM.format(
        requirement_json=json.dumps(requirement, indent=2),
        max_rounds=5
    ) + "\n\n" + BUYER_AGENT_OPENER

    response = await call_qwen3(messages, system_prompt=system, max_tokens=300, temperature=0.6)
    return {"message": response, "needs_buyer_input": False}


async def buyer_agent_respond(
    conversation_history: list,
    supplier_message: str,
    requirement: dict,
    negotiation_round: int,
    max_rounds: int = 5,
    profile_md: str = "",
    buyer_settings_md: str = "",
) -> dict:
    """
    Generate buyer agent's response to supplier's message.

    Returns:
    {
        "message": str,
        "needs_buyer_input": bool,
        "buyer_input_reason": str,
        "extracted_offer": dict or None,
        "is_deal_ready": bool,
    }
    """
    base_system = BUYER_AGENT_SYSTEM.format(
        requirement_json=json.dumps(requirement, indent=2),
        max_rounds=max_rounds,
    )
    system = build_agent_system_prompt(base_system, profile_md, buyer_settings_md)

    context = f"[Round {negotiation_round} of {max_rounds}]"
    if negotiation_round >= max_rounds - 1:
        context += " [FINAL ROUND — try to close the deal now]"

    messages = []
    for msg in conversation_history:
        role = "user" if msg["role"] in ("ai_supplier", "human_supplier") else "assistant"
        messages.append({"role": role, "content": [{"text": msg["content"]}]})
    messages.append({"role": "user", "content": [{"text": f"{context}\nSupplier: {supplier_message}"}]})

    response = await call_qwen3(messages, system_prompt=system, max_tokens=512, temperature=0.65)

    # Parse response for special markers
    needs_input = "<NEEDS_BUYER_INPUT" in response
    input_reason = ""
    if needs_input:
        try:
            start = response.index('reason="') + 8
            end = response.index('"', start)
            input_reason = response[start:end]
        except ValueError:
            input_reason = "Supplier has an unusual condition that needs your review"

    # Extract offer if present
    extracted_offer = None
    is_deal_ready = False
    if "<OFFER " in response:
        try:
            offer_str = response[response.index("<OFFER "):response.index("/>", response.index("<OFFER ")) + 2]
            extracted_offer = _parse_offer_tag(offer_str)
            # Check if offer meets requirement
            if extracted_offer and requirement.get("budget_max"):
                if extracted_offer.get("price_per_unit", float("inf")) <= requirement["budget_max"]:
                    is_deal_ready = True
        except Exception:
            pass

    # Clean message for display
    clean_message = response
    for tag in ["<NEEDS_BUYER_INPUT", "<OFFER ", "/>"]:
        if tag in clean_message:
            clean_message = clean_message[:clean_message.index(tag)].strip()

    return {
        "message": clean_message or response,
        "needs_buyer_input": needs_input,
        "buyer_input_reason": input_reason,
        "extracted_offer": extracted_offer,
        "is_deal_ready": is_deal_ready,
    }


async def generate_comparison_summary(leads_with_offers: list, requirement: dict) -> dict:
    """Generate AI recommendation from all final offers."""
    offers_json = json.dumps(leads_with_offers, indent=2)
    requirement_json = json.dumps(requirement, indent=2)

    prompt = f"""Buyer Requirement:
{requirement_json}

Final offers from suppliers:
{offers_json}

Analyze all offers and:
1. Score each supplier 0-100 (40% price fit, 30% lead time, 20% reliability, 10% MOQ flexibility)
2. Identify the top recommendation with clear reasoning
3. Note any concerns for each supplier

Return JSON:
{{
  "ranked_offers": [
    {{
      "lead_id": X,
      "ai_score": 87,
      "rank": 1,
      "price_per_unit": 175,
      "lead_time_days": 10,
      "recommendation_note": "Best balance of price and reliability"
    }}
  ],
  "top_recommendation": {{
    "lead_id": X,
    "reason": "Clear reason why this is the best choice"
  }}
}}"""

    messages = [{"role": "user", "content": [{"text": prompt}]}]
    system = "You are a procurement analyst. Return only valid JSON."

    try:
        response = await call_qwen3(messages, system_prompt=system, max_tokens=1024)
        cleaned = response.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        return json.loads(cleaned)
    except Exception:
        return {"ranked_offers": [], "top_recommendation": None}


def _parse_offer_tag(offer_str: str) -> dict:
    """Parse <OFFER price_per_unit="X" ... /> into dict."""
    import re
    attrs = re.findall(r'(\w+)="([^"]*)"', offer_str)
    result = {}
    for key, val in attrs:
        try:
            result[key] = float(val) if "." in val else int(val)
        except ValueError:
            result[key] = val
    return result