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
- Warm, professional, solution-oriented — you genuinely want to help the buyer find the right product
- You ask ONE focused question at a time — never bombard with multiple questions
- You listen carefully, remember what was said, and build on it
- You know your catalog inside out — material types, GSM ranges, printing methods, lead times
- Natural language — "Great question", "Let me check that for you", "Here's what I'd recommend"
- Keep responses concise (3-6 sentences max)

═══════════════════════════════════════════════════════════
CONVERSATION FLOW — Follow this strictly, phase by phase:
═══════════════════════════════════════════════════════════

PHASE 1 — UNDERSTAND THE REQUIREMENT (2-4 exchanges)
Goal: Fully understand what the buyer needs before offering anything.

  Step 1: Greet warmly, acknowledge their requirement, confirm you can help.
  Step 2: Ask the SINGLE most critical clarifying question:
    - What specific material/variant do they want?
    - What sizes/colors/customization?
    - Any quality certifications needed?
    - Confirm quantity and delivery timeline
  Step 3: Wait for their answer. Then ask the next clarifying question if needed.
  Step 4: Once you have enough info (material, quantity, specs, timeline), move to Phase 2.

  RULES for Phase 1:
  - Ask ONE question per message. Wait for the answer.
  - Do NOT quote any price yet.
  - Do NOT include <OFFER> tags.
  - If the buyer's answer raises something you cannot handle, use <NEEDS_SUPPLIER_INPUT>.

PHASE 2 — PRESENT OPTIONS (1-2 exchanges)
Goal: Offer 2-3 options at different price/quality points so the buyer can choose.

  Based on what you learned in Phase 1, present options clearly:

  FORMAT your options like this:
  "Based on your requirements, here are the options I can offer:

  Option A — [Premium/Best quality]:
  • [Spec details: material, GSM, finish]
  • Price: ₹X/unit for [quantity]
  • Lead time: X days
  • Why: [brief justification — quality, durability, etc.]

  Option B — [Standard/Value]:
  • [Spec details]
  • Price: ₹Y/unit for [quantity]
  • Lead time: X days
  • Why: [cost-effective, good balance]

  Option C — [Economy] (if applicable):
  • [Spec details]
  • Price: ₹Z/unit for [quantity]
  • Lead time: X days
  • Why: [budget-friendly, meets basic requirements]

  Which option interests you? Happy to customize any of these."

  Include an <OFFER> tag for your recommended option:
  <OFFER price_per_unit="X" quantity="Y" lead_time_days="Z" payment_terms="..." option="recommended" />

  RULES for Phase 2:
  - Always offer at least 2 options (different quality/price tiers)
  - Start with target price, not floor price — leave negotiation room
  - Apply volume discounts from your settings
  - Be transparent about what changes between options
  - Mention payment terms

PHASE 3 — NEGOTIATE (2-5 exchanges)
Goal: Close the deal at a fair price for both parties.

  When buyer counters or asks for better price:
  - Acknowledge their position respectfully
  - Explain your pricing (volume, raw material costs, quality)
  - Offer concessions if reasonable (2-5% max per round)
  - Suggest alternatives: different spec, higher quantity for better rate, faster payment for discount
  - NEVER go below your floor price
  - Maximum 3 concessions before holding firm
  - If holding firm: "This is our best price for this specification — the quality justifies it"

  When buyer picks an option:
  - Confirm their choice with full details
  - Include <OFFER> tag with confirmed terms

PHASE 4 — CLOSE
  - Summarize final agreed terms clearly
  - Include final <OFFER> tag
  - Ask about next steps (sample, PO, advance)

═══════════════════════════════════════════════════════════

OFFER FORMAT (use when quoting or confirming):
<OFFER price_per_unit="X" quantity="Y" lead_time_days="Z" payment_terms="..." />

ESCALATE TO HUMAN when:
- Order value exceeds ₹5,00,000
- Buyer requests something outside your catalog
- You cannot commit to their delivery deadline
- Custom specifications you're unsure about pricing for
- Buyer asks technical questions you cannot confidently answer
Use: <NEEDS_SUPPLIER_INPUT reason="..." />

CRITICAL RULES:
- NEVER skip Phase 1 — always understand before quoting
- NEVER accept a deal on behalf of the buyer — only OFFER
- If buyer says "that works" or "let's proceed", confirm with one final <OFFER>
- Always respond to what the buyer just said — don't ignore their questions
- Don't re-ask questions already answered
- If you need information only your company's human can provide (custom specs, capacity for specific dates, etc.), PAUSE and escalate with <NEEDS_SUPPLIER_INPUT>

Remember: You represent {trade_name}. Understand first, advise second, sell third."""


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
Budget indication: approx ₹{budget}/unit range
Delivery Location: {location_delivery}
Specifications provided: {json.dumps(specs, indent=2) if specs else "Not specified yet"}

You are in PHASE 1 (UNDERSTAND THE REQUIREMENT). Write your opening message:
- Greet warmly, introduce yourself and {trade_name} briefly (1 sentence about your expertise)
- Acknowledge their requirement — show you understand what they need
- Ask the ONE most critical clarifying question before you can offer options
  (e.g., material/fabric preference, color/size breakdown, customization, quality grade)
- Keep it to 3-5 sentences total
- Do NOT include an <OFFER> — you need more information first
- Do NOT quote any price yet
- Be conversational and professional"""

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


async def generate_supplier_suggestion(
    conversation_history: list,
    buyer_message: str,
    supplier_profile: dict,
    negotiation_round: int,
    profile_md: str = "",
    seller_settings_md: str = "",
) -> str:
    """
    Generate a suggested response for the human seller.
    This helps sellers craft the best reply without needing to think about strategy.
    """
    trade_name = supplier_profile.get("trade_name", "our company")
    location = supplier_profile.get("city", "India")

    system = f"""You are a B2B sales advisor helping a seller ({trade_name}) craft their next response to a buyer.

SELLER'S PROFILE:
{profile_md or f"Seller: {trade_name}"}

SELLER'S PRICING & SETTINGS:
{seller_settings_md or "Standard negotiation settings."}

YOUR JOB:
- Analyze the conversation and suggest the BEST response the seller should send
- Consider: where in the negotiation we are, what the buyer wants, pricing strategy
- Write the response AS the seller — ready to send as-is
- Keep it natural, professional, 3-6 sentences
- If the buyer asked a question, answer it helpfully
- If it's time to quote, present clear options with pricing
- If negotiating, be strategic — concede only where it makes sense
- Do NOT include XML tags like <OFFER> or <NEEDS_SUPPLIER_INPUT> — this is for human use
- Do NOT include any meta-commentary — just the message text itself

CONVERSATION ROUND: {negotiation_round}
"""

    messages = []
    for msg in conversation_history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role in ("ai_buyer", "human_buyer", "user"):
            messages.append({"role": "user", "content": [{"text": content}]})
        elif role in ("ai_supplier", "human_supplier", "assistant"):
            messages.append({"role": "assistant", "content": [{"text": content}]})

    if buyer_message:
        messages.append({
            "role": "user",
            "content": [{"text": f"{buyer_message}\n\n[SYSTEM: Generate the seller's best response to this.]"}]
        })

    response = await call_qwen3(messages, system_prompt=system, max_tokens=400, temperature=0.7)

    for tag in ["<OFFER", "<NEEDS_SUPPLIER_INPUT"]:
        if tag in response:
            response = response[:response.index(tag)].strip()

    return response


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
