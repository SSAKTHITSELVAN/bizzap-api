"""
Profile Agent — Uses Qwen3 VL to extract business profile from external URLs
(IndiaMART, Alibaba, LinkedIn, etc.) and GST data.
"""
import json
from typing import Optional, List
from app.agents.bedrock_client import call_qwen3, call_qwen3_with_url


PROFILE_EXTRACTION_SYSTEM = """You are a business intelligence agent specializing in Indian B2B commerce.
Given a URL to a business listing (IndiaMART, Alibaba, LinkedIn, TradeIndia, etc.) or GST registration data,
extract a complete structured business profile.

Always respond with valid JSON only. No markdown, no explanation, just JSON.

JSON structure:
{
  "trade_name": "string",
  "product_categories": ["list of product categories"],
  "capabilities": {
    "products": [
      {
        "name": "product name",
        "specifications": {"key": "value"},
        "grades": ["grade1"],
        "certifications": []
      }
    ]
  },
  "pricing_bands": {
    "product_name": {"min": 0, "max": 0, "unit": "per kg / per piece / per meter"}
  },
  "min_order_quantities": {"product_name": {"quantity": 0, "unit": "kg/pieces"}},
  "max_order_quantities": {"product_name": {"quantity": 0, "unit": "kg/pieces"}},
  "serviceable_locations": ["state or city list"],
  "standard_lead_times": {"product_name": {"days": 0}},
  "payment_terms": ["Advance", "Net 30"],
  "certifications": ["ISO 9001", "BIS"],
  "is_supplier": true,
  "is_buyer": false,
  "business_summary": "2-3 sentence summary of the business"
}

If data is not available for a field, use null. Always include business_summary."""


async def build_profile_from_url(url: str) -> dict:
    """Extract business profile from a single URL using Qwen3 VL."""
    instruction = """Extract all business information from this URL and return as structured JSON.
Focus on: products sold/manufactured, pricing, MOQ, locations served, certifications, lead times, payment terms.
Determine if this business is primarily a supplier, buyer, or both."""

    try:
        raw_response = await call_qwen3_with_url(url, instruction)
        # Clean response and parse JSON
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        return json.loads(cleaned)
    except (json.JSONDecodeError, Exception):
        return {}


async def build_profile_from_multiple_urls(urls: List[str]) -> dict:
    """Build a merged profile from multiple business listing URLs."""
    profiles = []
    for url in urls:
        if url and url.strip():
            profile = await build_profile_from_url(url.strip())
            if profile:
                profiles.append(profile)

    if not profiles:
        return {}

    if len(profiles) == 1:
        return profiles[0]

    # Merge profiles using Qwen3
    merge_prompt = f"""Merge these {len(profiles)} business profiles into one comprehensive profile.
Combine all products, locations, certifications. Use the most complete data for each field.

Profiles to merge:
{json.dumps(profiles, indent=2)}

Return single merged JSON in the exact same format."""

    messages = [{"role": "user", "content": [{"text": merge_prompt}]}]
    try:
        raw = await _call_qwen3_json(messages)
        return json.loads(raw)
    except Exception:
        return profiles[0]  # fallback to first profile


async def enrich_profile_with_gst(profile_data: dict, gst_data: dict) -> dict:
    """Merge GST API data into the extracted profile."""
    # GST data takes precedence for legal/registration info
    profile_data["legal_name"] = gst_data.get("lgnm", profile_data.get("trade_name", ""))
    profile_data["trade_name"] = gst_data.get("tradeNam", profile_data.get("trade_name", ""))
    profile_data["business_type"] = gst_data.get("ctb", "")
    profile_data["gst_status"] = gst_data.get("sts", "")
    profile_data["registration_date"] = gst_data.get("rgdt", "")
    profile_data["nature_of_business"] = gst_data.get("nba", [])

    # Address from GST
    pradr = gst_data.get("pradr", {})
    profile_data["address"] = pradr.get("adr", "")
    addr_detail = pradr.get("addr", {})
    profile_data["state"] = addr_detail.get("stcd", "")
    profile_data["city"] = addr_detail.get("loc", addr_detail.get("dst", ""))
    profile_data["pincode"] = addr_detail.get("pncd", "")

    return profile_data


async def generate_profile_summary(profile_data: dict) -> str:
    """Generate a human-readable business summary from profile data."""
    prompt = f"""Given this business profile data, write a concise 2-3 sentence business summary
for an AI sales/sourcing agent to use when representing this business in negotiations.

Profile data:
{json.dumps(profile_data, indent=2)}

Write the summary in third person. Focus on what they sell, where they operate, and their key strengths.
Return only the summary text, no JSON."""

    messages = [{"role": "user", "content": [{"text": prompt}]}]
    system = "You are a business analyst. Write concise, factual business summaries."
    try:
        from app.agents.bedrock_client import call_qwen3
        return await call_qwen3(messages, system_prompt=system, max_tokens=200)
    except Exception:
        name = profile_data.get("trade_name") or profile_data.get("legal_name", "This business")
        cats = profile_data.get("product_categories", [])
        state = profile_data.get("state", "India")
        cats_str = ", ".join(cats[:3]) if cats else "various products"
        return f"{name} is a B2B business based in {state}, dealing in {cats_str}."


async def _call_qwen3_json(messages: list) -> str:
    """Internal helper for JSON-only Qwen3 calls."""
    from app.agents.bedrock_client import call_qwen3
    response = await call_qwen3(messages, system_prompt=PROFILE_EXTRACTION_SYSTEM, max_tokens=3000)
    cleaned = response.strip()
    if cleaned.startswith("```"):
        parts = cleaned.split("```")
        cleaned = parts[1] if len(parts) > 1 else cleaned
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    return cleaned
