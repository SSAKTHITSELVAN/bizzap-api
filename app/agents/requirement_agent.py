from app.agents.config_agent import build_agent_system_prompt
"""
Requirement Agent — Enriches buyer requirements through conversational AI.
Collects mandatory fields (product, quantity, budget) and additional details
via follow-up questions, one at a time.
"""
import json
from typing import Optional
from app.agents.bedrock_client import call_qwen3


REQUIREMENT_SYSTEM = """You are Bisdom's sourcing assistant — a smart, efficient AI agent helping
Indian SME business owners post procurement requirements.

Your job:
1. Analyze the buyer's requirement message
2. Identify what information is missing
3. Ask ONE focused follow-up question at a time to fill gaps
4. Once all mandatory fields are captured, present a structured summary for confirmation

MANDATORY fields (must collect all):
- product: what exactly they need
- quantity: how much (with unit — kg, pieces, meters, liters, sets)
- budget_max: maximum price willing to pay (INR per unit or total)

IMPORTANT additional fields (collect if not mentioned):
- specifications: material, grade, color, size, GSM, dimensions
- delivery_location: city and state
- delivery_days: deadline in days
- order_type: one-time or recurring
- packaging requirements

RULES:
- Ask ONE question at a time. Never ask multiple questions in one message.
- Keep questions short and conversational — Indian business owner style.
- When all mandatory fields are captured, output a JSON block like this:
  <REQUIREMENT_READY>
  {
    "product": "...",
    "quantity": 100,
    "quantity_unit": "pieces",
    "budget_min": null,
    "budget_max": 200,
    "budget_unit": "INR per piece",
    "specifications": {...},
    "delivery_location": "...",
    "delivery_days": null,
    "order_type": "one-time",
    "packaging": "standard",
    "additional_notes": null
  }
  </REQUIREMENT_READY>
  Then say: "Here's your requirement summary. Does everything look correct? Type 'yes' to confirm or let me know what to change."

- Before <REQUIREMENT_READY>, only output natural conversational text — no JSON.
- Be brief. Indian business owners are busy. Get to the point."""


async def process_requirement_message(
    conversation_history: list,
    new_message: str,
    current_requirement: Optional[dict] = None,
    profile_md: str = "",
    buyer_settings_md: str = "",
) -> dict:
    """
    Process a new user message in the requirement enrichment conversation.

    Returns:
    {
        "ai_response": str,          # what to show the user
        "is_complete": bool,         # all mandatory fields captured
        "requirement_data": dict,    # structured requirement if complete
        "updated_history": list      # updated conversation history
    }
    """
    # Build message history for Qwen3
    messages = []
    for msg in conversation_history:
        role = "user" if msg["role"] == "user" else "assistant"
        messages.append({"role": role, "content": [{"text": msg["content"]}]})

    # Add current message
    messages.append({"role": "user", "content": [{"text": new_message}]})

    enriched_system = build_agent_system_prompt(REQUIREMENT_SYSTEM, profile_md, buyer_settings_md)
    ai_response = await call_qwen3(
        messages,
        system_prompt=enriched_system,
        max_tokens=1024,
        temperature=0.6,
    )

    # Check if requirement is ready
    is_complete = "<REQUIREMENT_READY>" in ai_response
    requirement_data = None
    display_response = ai_response

    if is_complete:
        try:
            # Extract JSON from response
            start = ai_response.index("<REQUIREMENT_READY>") + len("<REQUIREMENT_READY>")
            end = ai_response.index("</REQUIREMENT_READY>")
            json_str = ai_response[start:end].strip()
            requirement_data = json.loads(json_str)

            # Clean display response — remove the JSON block
            display_response = (
                ai_response[:ai_response.index("<REQUIREMENT_READY>")].strip()
                + "\n\n"
                + ai_response[end + len("</REQUIREMENT_READY>"):].strip()
            ).strip()

            if not display_response:
                display_response = (
                    "Here's your requirement summary. Does everything look correct? "
                    "Type 'yes' to confirm or let me know what to change."
                )
        except (ValueError, json.JSONDecodeError):
            is_complete = False

    # Update conversation history
    updated_history = conversation_history + [
        {"role": "user", "content": new_message},
        {"role": "assistant", "content": display_response},
    ]

    return {
        "ai_response": display_response,
        "is_complete": is_complete,
        "requirement_data": requirement_data,
        "updated_history": updated_history,
    }


async def confirm_requirement(requirement_data: dict, buyer_profile: dict) -> dict:
    """
    Final validation and structuring of requirement before matching.
    Adds buyer context and prepares the matching JSON.
    """
    matching_json = {
        **requirement_data,
        "buyer_location": buyer_profile.get("city", ""),
        "buyer_state": buyer_profile.get("state", ""),
        "buyer_business_type": buyer_profile.get("business_type", ""),
        "status": "confirmed",
    }
    return matching_json
