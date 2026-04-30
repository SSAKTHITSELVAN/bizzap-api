"""
Config Agent — generates default profile_md, buyer_settings_md, seller_settings_md
from GST data + URL-extracted profile. These become editable markdown for the user.
Also injects user config into agent system prompts.
"""


def build_profile_md(gst_data: dict, url_profile: dict) -> str:
    """Generate default profile markdown from GST + URL extracted data."""
    name = url_profile.get("trade_name") or gst_data.get("tradeNam") or gst_data.get("lgnm", "My Business")
    legal = gst_data.get("lgnm", "")
    btype = gst_data.get("ctb", "")
    gstin = gst_data.get("gstin", "")
    state = url_profile.get("state") or gst_data.get("pradr", {}).get("addr", {}).get("stcd", "")
    city  = url_profile.get("city")  or gst_data.get("pradr", {}).get("addr", {}).get("loc", "")
    addr  = gst_data.get("pradr", {}).get("adr", "")
    reg_date = gst_data.get("rgdt", "")
    nba   = gst_data.get("nba", [])
    status = gst_data.get("sts", "Active")

    cats  = url_profile.get("product_categories") or []
    caps  = url_profile.get("capabilities") or {}
    summary = url_profile.get("business_summary", "")
    locs  = url_profile.get("serviceable_locations") or []
    certs = url_profile.get("certifications") or []
    pay   = url_profile.get("payment_terms") or []

    lines = [
        f"# Business Profile — {name}",
        "",
        "## Company Details",
        f"- **Trade Name:** {name}",
        f"- **Legal Name:** {legal}",
        f"- **GSTIN:** {gstin} ({status})",
        f"- **Business Type:** {btype}",
        f"- **GST Registered:** {reg_date}",
        f"- **Location:** {city}, {state}",
        f"- **Address:** {addr}",
        f"- **Nature of Business:** {', '.join(nba)}",
        "",
    ]

    if summary:
        lines += ["## About", summary, ""]

    if cats:
        lines += ["## Product Categories", ""]
        for c in cats:
            lines.append(f"- {c}")
        lines.append("")

    prods = caps.get("products") or []
    if prods:
        lines += ["## Products & Specifications", ""]
        for p in prods:
            pname = p.get("name", "Product")
            specs = p.get("specifications") or {}
            spec_str = ", ".join(f"{k}: {v}" for k, v in specs.items()) if specs else ""
            lines.append(f"### {pname}")
            if spec_str:
                lines.append(f"- Specs: {spec_str}")
            grades = p.get("grades") or []
            if grades:
                lines.append(f"- Grades: {', '.join(grades)}")
            pcerts = p.get("certifications") or []
            if pcerts:
                lines.append(f"- Certifications: {', '.join(pcerts)}")
            lines.append("")

    if locs:
        lines += ["## Serviceable Locations", ", ".join(locs), ""]

    if certs:
        lines += ["## Certifications", ""]
        for c in certs:
            lines.append(f"- {c}")
        lines.append("")

    if pay:
        lines += ["## Payment Terms", ""]
        for p in pay:
            lines.append(f"- {p}")
        lines.append("")

    lines += [
        "---",
        "*Edit this profile freely — the AI agents read it before every negotiation.*"
    ]

    return "\n".join(lines)


DEFAULT_BUYER_SETTINGS = """# Buyer AI Agent Settings

## Negotiation Strategy
- Style: Balanced (neither too aggressive nor too soft)
- Always push for price at or below budget
- Maximum negotiation rounds: 5
- If supplier price is within 5% of budget, accept
- If supplier price is 10–20% above budget, counter firmly
- If supplier price is >20% above budget, walk away after 2 rounds

## What to Prioritize (in order)
1. Price — always the primary goal
2. Lead time — must meet deadline
3. Quality / certifications
4. Payment terms

## Auto-Accept Rules
- Accept if: price ≤ budget AND lead time ≤ deadline AND fit score > 75
- Never auto-accept orders above ₹5,00,000 — always escalate to me

## Negotiation Tactics
- Use competing supplier offers as leverage
- Ask for volume discounts when quantity > 100 units
- Never reveal the exact budget ceiling
- Always ask for best price in final round

## Escalate to me when
- Supplier proposes unusual terms not in standard T&C
- MOQ is significantly higher than my requirement
- Delivery deadline cannot be met by any counter-offer
- Order value exceeds ₹5,00,000

## Communication Style
- Professional and direct
- Respectful — this is B2B, relationships matter
- Use supplier's language when possible (Tamil/Hindi/English)

---
*Edit these settings to customize how your buying AI negotiates on your behalf.*
"""

DEFAULT_SELLER_SETTINGS = """# Seller AI Agent Settings

## My Products & Pricing Floors
<!-- Add your products and minimum acceptable prices here -->
<!-- Example:
- Cotton T-Shirts (180 GSM): Floor ₹150/piece, Target ₹190/piece
- Polo T-Shirts (220 GSM): Floor ₹200/piece, Target ₹240/piece
-->

## Negotiation Strategy
- Style: Balanced
- Lead with target price, not floor price
- Keep 8–10% negotiation room in opening offer
- Maximum negotiation rounds before escalating: 4

## Volume Discount Rules
- 50–100 units: standard price
- 100–500 units: 5% discount
- 500+ units: 10% discount
- 1000+ units: 15% discount

## Auto-Accept Rules
- Auto-accept if: offer ≥ floor price AND quantity within capacity
- Auto-decline if: offer < floor price AND buyer refuses counter
- Always escalate if order value > ₹5,00,000

## What I Never Compromise On
- Never go below floor price
- Never commit to delivery timelines I cannot meet
- Never accept orders when capacity is full

## Escalate to me when
- Buyer requests custom specifications not in catalog
- Order value > ₹5,00,000
- Buyer wants payment terms beyond Net 30
- Fit score is borderline (40–65)

## Communication Style
- Professional and warm
- Match buyer's language (Tamil/Hindi/English)
- Emphasize quality and reliability
- Use credibility: years in business, certifications, past clients

---
*Edit these settings to customize how your selling AI negotiates on your behalf.*
"""


def build_agent_system_prompt(
    base_prompt: str,
    profile_md: str,
    settings_md: str,
) -> str:
    """
    Inject user's profile and settings into any agent system prompt.
    Called before every Bedrock request so agents always have current context.
    """
    context = []

    if profile_md and profile_md.strip():
        context.append(f"""
=== YOUR COMPANY PROFILE ===
{profile_md.strip()}
=== END COMPANY PROFILE ===
""")

    if settings_md and settings_md.strip():
        context.append(f"""
=== YOUR AGENT CONFIGURATION ===
{settings_md.strip()}
=== END AGENT CONFIGURATION ===
""")

    if context:
        return "\n".join(context) + "\n\n" + base_prompt
    return base_prompt
