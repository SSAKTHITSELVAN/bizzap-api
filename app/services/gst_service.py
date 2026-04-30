"""GST verification service using gstincheck.co.in API."""
import httpx
from app.core.config import settings


async def verify_gstin(gstin: str) -> dict:
    """
    Verify GSTIN and return business details.

    Returns:
    {
        "valid": bool,
        "data": dict or None,
        "error": str or None
    }
    """
    gstin = gstin.upper().strip()
    url = f"{settings.GST_API_BASE_URL}/{settings.GST_API_KEY}/{gstin}"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            result = response.json()

            if not result.get("flag"):
                return {
                    "valid": False,
                    "data": None,
                    "error": result.get("message", "GSTIN not found"),
                }

            gst_data = result.get("data", {})
            if gst_data.get("sts", "").lower() != "active":
                return {
                    "valid": False,
                    "data": gst_data,
                    "error": f"GSTIN is {gst_data.get('sts', 'inactive')}",
                }

            return {"valid": True, "data": gst_data, "error": None}

    except httpx.HTTPStatusError as e:
        return {"valid": False, "data": None, "error": f"GST API error: {e.response.status_code}"}
    except Exception as e:
        return {"valid": False, "data": None, "error": str(e)}


def extract_gst_profile(gst_data: dict) -> dict:
    """Extract clean profile fields from raw GST API response."""
    pradr = gst_data.get("pradr", {})
    addr_detail = pradr.get("addr", {})

    return {
        "legal_name": gst_data.get("lgnm", ""),
        "trade_name": gst_data.get("tradeNam", ""),
        "business_type": gst_data.get("ctb", ""),
        "gst_status": gst_data.get("sts", ""),
        "registration_date": gst_data.get("rgdt", ""),
        "nature_of_business": gst_data.get("nba", []),
        "address": pradr.get("adr", ""),
        "state": addr_detail.get("stcd", ""),
        "city": addr_detail.get("loc", addr_detail.get("dst", "")),
        "pincode": addr_detail.get("pncd", ""),
        "einvoice_status": gst_data.get("einvoiceStatus", ""),
    }
