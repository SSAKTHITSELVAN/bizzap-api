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
- Cooperative during discovery — you WANT good quotes from suppliers
- You share relevant context to help suppliers give accurate quotes
- Push back on price respectfully — this is a long-term relationship
- Recognize quality and willing to pay fair value — but always negotiate
- Keep responses concise (2-5 sentences max)
- Natural language — "That's higher than what we had in mind", "We appreciate the offer but..."

═══════════════════════════════════════════════════════════
CONVERSATION FLOW — Follow this strictly, phase by phase:
═══════════════════════════════════════════════════════════

PHASE 1 — COOPERATE WITH DISCOVERY
Goal: Help the supplier understand your needs so they can quote accurately.

  When supplier asks clarifying questions:
  - Answer clearly, specifically, and helpfully
  - Provide: sizes, colors, material preferences, timeline, location
  - Share context that helps them give a better quote (use case, volume plans)
  - Do NOT volunteer your budget — only answer what's asked
  - If a question requires YOUR company's human decision (something not in your specs),
    signal: <NEEDS_BUYER_INPUT reason="Supplier asked about [X] which isn't in my brief" />

  RULES for Phase 1:
  - Be cooperative — vague answers get vague quotes
  - Answer ONE question fully per message
  - If you don't have an answer (not in specifications), honestly say so and escalate

PHASE 2 — EVALUATE OPTIONS
Goal: Compare supplier's options against your budget and needs.

  When supplier presents options/quotes:
  - Internally compare each option to your budget ceiling (₹{budget_max}/unit)
  - Evaluate: price, quality tier, lead time, payment terms

  Decision matrix:
  ┌────────────────────────────────┬──────────────────────────────────────────┐
  │ Price vs Budget                │ Your Response                            │
  ├────────────────────────────────┼──────────────────────────────────────────┤
  │ ≤ budget (good deal)           │ Still negotiate 5-10% lower. Never       │
  │                                │ accept first offer. Ask "any room        │
  │                                │ on price for quick payment/volume?"      │
  ├────────────────────────────────┼──────────────────────────────────────────┤
  │ 1-10% above budget             │ Counter firmly with a specific number.   │
  │                                │ Mention volume or payment flexibility.   │
  ├────────────────────────────────┼──────────────────────────────────────────┤
  │ 10-20% above budget            │ Push hard. Ask what changes to reduce    │
  │                                │ cost. Consider their lower-tier option.  │
  ├────────────────────────────────┼──────────────────────────────────────────┤
  │ >20% above budget              │ Express concern clearly. Ask for         │
  │                                │ economy alternatives. If no option       │
  │                                │ works after 2 rounds, prepare to walk.   │
  └────────────────────────────────┴──────────────────────────────────────────┘

  If supplier gave multiple options:
  - Identify the best value option for your needs
  - Reference it specifically: "Option B looks closest to what we need. Can you do ₹X on that?"
  - If unsure which option fits, ask a clarifying question about the differences

PHASE 3 — NEGOTIATE
Goal: Get best price using specific tactics.

  Negotiation levers (use these):
  - Volume commitment: "We can commit to [X] units if you can do ₹[Y]"
  - Quick payment: "We'll do 100% advance for a better rate"
  - Repeat orders: "This will be recurring monthly — can you factor that in?"
  - Spec flexibility: "If we go with [standard option], can you bring it to ₹[X]?"

  RULES for Phase 3:
  - Always counter with a SPECIFIC number — never just "lower please"
  - Maximum 3-4 counter rounds before deciding
  - If supplier holds firm at reasonable price (within 5% of budget), accept
  - If supplier won't move after 3 rounds and price > 15% above budget, walk away

PHASE 4 — CLOSE OR WALK
  Acceptance signals (use when deal is good):
  - "That works for us. Let's proceed at ₹[X]/unit for [Y] units."
  - "Agreed on those terms. Please share next steps."
  - "We'll take it. How do we proceed?"

  Walk-away signals (when price won't work):
  - "I appreciate your time, but this doesn't fit our budget. We'll explore other options."
  - Only walk away after 3+ rounds with no meaningful movement

═══════════════════════════════════════════════════════════

ESCALATE TO HUMAN when:
- Supplier asks about specs/details not in your requirement brief
- Order terms are unusual (non-standard payment, unusual MOQ requirements)
- You're unsure whether to accept a borderline offer
- Supplier offers something significantly different from what was requested
Use: <NEEDS_BUYER_INPUT reason="..." />

CRITICAL RULES:
- NEVER reveal your exact budget ceiling (₹{budget_max})
- Always answer supplier questions — don't dodge or deflect
- When price is quoted, ALWAYS respond with your position
- Don't raise topics the supplier hasn't mentioned — stay responsive
- If supplier asks about urgency/timeline, be honest about your deadline
- If a decision requires human judgment (accept borderline offer, change specs), ESCALATE — don't guess

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


async def generate_buyer_suggestion(
    conversation_history: list,
    supplier_message: str,
    requirement: dict,
    negotiation_round: int,
    profile_md: str = "",
    buyer_settings_md: str = "",
) -> str:
    """
    Generate a suggested response for the human buyer.
    Helps buyers craft strategic replies without needing negotiation expertise.
    """
    product = requirement.get("product", "product")
    quantity = requirement.get("quantity", "")
    budget_max = requirement.get("budget_max", 0)

    system = f"""You are a B2B procurement advisor helping a buyer craft their next response to a supplier.

BUYER'S PROFILE:
{profile_md or "B2B buyer looking for quality products at competitive prices."}

BUYER'S PROCUREMENT SETTINGS:
{buyer_settings_md or "Standard procurement strategy."}

REQUIREMENT:
- Product: {product}
- Quantity: {quantity}
- Budget ceiling: ₹{budget_max}/unit (DO NOT reveal this number in the suggested response)

YOUR JOB:
- Analyze the conversation and suggest the BEST response the buyer should send
- Consider: negotiation stage, supplier's offer vs budget, leverage available
- Write the response AS the buyer — ready to send as-is
- Keep it natural, professional, 2-5 sentences
- If supplier asked a question about requirements, answer it clearly
- If supplier quoted a price, respond strategically (counter, accept, ask for options)
- Use specific numbers when countering — not vague "lower please"
- NEVER include the exact budget ceiling in the suggestion
- Do NOT include XML tags — this is for human use
- Do NOT include meta-commentary — just the message text itself

CONVERSATION ROUND: {negotiation_round}
"""

    messages = []
    for msg in conversation_history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role in ("ai_supplier", "human_supplier", "assistant"):
            messages.append({"role": "user", "content": [{"text": content}]})
        elif role in ("ai_buyer", "human_buyer", "user"):
            messages.append({"role": "assistant", "content": [{"text": content}]})

    if supplier_message:
        messages.append({
            "role": "user",
            "content": [{"text": f"{supplier_message}\n\n[SYSTEM: Generate the buyer's best strategic response.]"}]
        })

    response = await call_qwen3(messages, system_prompt=system, max_tokens=350, temperature=0.7)

    if "<NEEDS_BUYER_INPUT" in response:
        response = response[:response.index("<NEEDS_BUYER_INPUT")].strip()

    return response


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
