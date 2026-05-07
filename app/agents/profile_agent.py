"""
Profile Agent — Multi-agent IndiaMART supplier extraction pipeline.

5-stage async pipeline:
  1. CrawlerAgent   → HTML crawl: profile + our-products → category pages → product tables
  2. IdentityAgent  → LLM extracts supplier company info from profile HTML
  3. EnricherAgent  → LLM maps raw product specs → structured fields (batched)
  4. NormalizerAgent → GSM/price bucketing, quality tiers, agent-ready fields
  5. ValidatorAgent  → Completeness scoring + gap analysis
"""

import asyncio
import json
import re
from datetime import datetime
from typing import Optional, List
from urllib.parse import urlparse, urljoin

import httpx
from bs4 import BeautifulSoup

from app.agents.bedrock_client import call_qwen3

# ── Constants ─────────────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Referer": "https://www.google.com/",
}

SYS_PROMPT = "You are a B2B supplier data extraction agent. Return ONLY valid JSON. No markdown. No explanation."

NOISE_NAMES = {
    "about us", "our products", "contact us", "home", "profile",
    "deals in hsn code", "hsn code", "enquiry", "sitemap",
    "privacy policy", "terms", "feedback", "faq",
}

GSM_BUCKETS = {"low": (120, 150), "standard": (150, 180), "premium": (180, 260)}
PRICE_BUCKETS = {"budget": (0, 200), "mid": (200, 400), "premium": (400, 1000)}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _is_indiamart_url(url: str) -> bool:
    return "indiamart.com" in url.lower()


def _validate_url(url: str) -> str:
    url = url.strip()
    if not url.startswith("http"):
        url = "https://" + url
    url = url.replace("//m.", "//www.")
    return url


async def _fetch(url: str, delay: float = 0.3) -> Optional[str]:
    await asyncio.sleep(delay)
    try:
        async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
            r = await client.get(url, headers=HEADERS)
            if r.status_code != 200:
                return None
            return r.content.decode("utf-8", errors="replace")
    except Exception:
        return None


async def _call_llm(prompt: str, system: str = SYS_PROMPT, max_tokens: int = 2000, temperature: float = 0.1) -> str:
    messages = [{"role": "user", "content": [{"text": prompt}]}]
    return await call_qwen3(messages, system_prompt=system, max_tokens=max_tokens, temperature=temperature)


def _parse_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        return json.loads(m.group())
    raise ValueError("No JSON object found")


def _parse_json_array(text: str) -> list:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
    m = re.search(r"\[.*\]", text, re.DOTALL)
    if m:
        return json.loads(m.group())
    raise ValueError("No JSON array found")


def _is_noise_product(name: str) -> bool:
    clean = name.lower().strip()
    if clean in NOISE_NAMES:
        return True
    if len(clean) < 3:
        return True
    if any(x in clean for x in ["hsn code", "about us", "our product", "contact"]):
        return True
    return False


# ── Stage tracking callback type ──────────────────────────────────────────────

async def _noop_callback(stage: str, detail: str = ""):
    pass


# ══════════════════════════════════════════════════════════════════════════════
# AGENT 1 — CrawlerAgent
# ══════════════════════════════════════════════════════════════════════════════

class CrawlerAgent:

    async def run(self, url: str, on_progress=None) -> dict:
        on_progress = on_progress or _noop_callback

        parsed = urlparse(url)
        parts = [p for p in parsed.path.split("/") if p]
        slug = parts[0] if parts else "supplier"
        base = f"{parsed.scheme}://{parsed.netloc}/{slug}"

        result = {"url": url, "base_url": base, "profile_html": None, "category_pages": []}

        await on_progress("crawl", "Connecting to IndiaMART...")

        profile_url = f"{base}/profile.html"
        result["profile_html"] = await _fetch(profile_url)

        await on_progress("crawl", "Scanning product categories...")

        products_url = f"{base}/our-products.html"
        products_html = await _fetch(products_url)

        if not products_html:
            return result

        category_links = self._extract_category_links(products_html, base)
        await on_progress("crawl", f"Found {len(category_links)} categories")

        for idx, cat in enumerate(category_links, 1):
            await on_progress("crawl", f"Crawling category {idx}/{len(category_links)}: {cat['category'][:40]}")
            cat_html = await _fetch(cat["url"])
            if not cat_html:
                continue
            products = self._extract_products_from_category(cat_html, cat["url"], cat["category"])
            cat["products"] = products
            result["category_pages"].append(cat)

        total = sum(len(c.get("products", [])) for c in result["category_pages"])
        await on_progress("crawl", f"Extracted {total} raw products from {len(result['category_pages'])} categories")
        return result

    def _extract_category_links(self, html: str, base: str) -> list:
        soup = BeautifulSoup(html, "html.parser")
        links = []
        seen = set()

        for h2 in soup.find_all("h2"):
            a = h2.find("a", href=True)
            if a:
                href = a["href"].strip()
                category = a.get_text(strip=True)
                if not href or href.startswith("#") or "javascript" in href:
                    continue
                full_url = urljoin(base + "/", href)
                if full_url not in seen and category:
                    seen.add(full_url)
                    links.append({"category": category, "url": full_url, "products": []})

        if not links:
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                if href.endswith(".html") and not any(x in href for x in ["profile", "about", "contact", "photo", "enquiry"]):
                    full_url = urljoin(base + "/", href)
                    text = a.get_text(strip=True)
                    if full_url not in seen and text and len(text) > 3:
                        seen.add(full_url)
                        links.append({"category": text, "url": full_url, "products": []})

        return links[:20]

    def _extract_products_from_category(self, html: str, page_url: str, category: str) -> list:
        soup = BeautifulSoup(html, "html.parser")
        products = []

        containers = soup.find_all("div", class_=re.compile(r"FM_prdpge|prd_card|product-item|lstng_unit", re.I))

        if not containers:
            return self._find_products_by_h2(soup, page_url, category)

        for container in containers:
            product = self._parse_product_container(container, page_url, category)
            if product and product.get("name"):
                products.append(product)

        return products

    def _find_products_by_h2(self, soup, page_url: str, category: str) -> list:
        products = []

        for h2 in soup.find_all("h2", class_=re.compile(r"FM_f|prd|prod", re.I)):
            a = h2.find("a")
            if not a:
                continue
            name = a.get_text(strip=True)
            prod_url = a.get("href", "")
            if prod_url and not prod_url.startswith("http"):
                prod_url = urljoin(page_url, prod_url)

            parent = h2.find_parent("div", class_=re.compile(r"FM_|prd", re.I))
            if not parent:
                parent = h2.parent

            product = self._extract_product_from_section(name, parent, prod_url or page_url, category)
            if product:
                products.append(product)

        if not products:
            products = self._extract_by_tables(soup, page_url, category)

        return products

    def _extract_by_tables(self, soup, page_url: str, category: str) -> list:
        products = []
        tables = soup.find_all("table")

        for table in tables:
            rows = table.find_all("tr")
            specs = {}
            for row in rows:
                cells = row.find_all(["td", "th"])
                if len(cells) >= 2:
                    key = cells[0].get_text(strip=True)
                    val = cells[1].get_text(strip=True)
                    if key and val:
                        specs[key] = val

            if not specs:
                continue

            name = ""
            price = None
            moq = None

            parent = table.find_parent("div")
            if parent:
                h2 = parent.find_previous("h2")
                if h2:
                    a = h2.find("a")
                    name = a.get_text(strip=True) if a else h2.get_text(strip=True)

                price_el = parent.find(string=re.compile(r"₹\s*\d+"))
                if price_el:
                    m = re.search(r"₹\s*([\d,]+)", price_el)
                    if m:
                        price = int(m.group(1).replace(",", ""))

                moq_el = parent.find(string=re.compile(r"Minimum Order|MOQ", re.I))
                if moq_el:
                    m = re.search(r"(\d+)", str(moq_el.parent))
                    if m:
                        moq = int(m.group(1))

            if not moq and specs.get("MOQ"):
                m = re.search(r"(\d+)", specs["MOQ"])
                if m:
                    moq = int(m.group(1))

            if name or specs:
                products.append({
                    "name": name or f"{category} Product",
                    "category": category,
                    "price": price,
                    "moq": moq,
                    "specs": specs,
                    "url": page_url,
                })

        return products

    def _parse_product_container(self, container, page_url: str, category: str) -> Optional[dict]:
        name = ""
        prod_url = page_url
        h2 = container.find("h2")
        if h2:
            a = h2.find("a")
            if a:
                name = a.get_text(strip=True)
                href = a.get("href", "")
                prod_url = urljoin(page_url, href) if href else page_url
            else:
                name = h2.get_text(strip=True)

        if not name:
            return None

        return self._extract_product_from_section(name, container, prod_url, category)

    def _extract_product_from_section(self, name: str, section, prod_url: str, category: str) -> Optional[dict]:
        price = None
        moq = None
        specs = {}

        if not section:
            return {"name": name, "category": category, "price": None, "moq": None, "specs": {}, "url": prod_url}

        for el in section.find_all(string=re.compile(r"₹\s*[\d,]+")):
            m = re.search(r"₹\s*([\d,]+)", el)
            if m:
                price = int(m.group(1).replace(",", ""))
                break

        moq_el = section.find(string=re.compile(r"Minimum Order Quantity", re.I))
        if moq_el:
            m = re.search(r"(\d[\d,]*)", str(moq_el.parent.parent))
            if m:
                moq = int(m.group(1).replace(",", ""))

        table = section.find("table")
        if table:
            for row in table.find_all("tr"):
                cells = row.find_all(["td", "th"])
                if len(cells) >= 2:
                    key = cells[0].get_text(strip=True)
                    val = cells[1].get_text(strip=True)
                    if key and val and len(key) < 50:
                        specs[key] = val
            if not moq and specs.get("MOQ"):
                m = re.search(r"(\d+)", specs["MOQ"])
                if m:
                    moq = int(m.group(1))

        desc = ""
        for p_tag in section.find_all("p"):
            text = p_tag.get_text(" ", strip=True)
            if len(text) > 50 and text not in desc:
                desc += text + " "
        desc = desc.strip()[:400]

        return {
            "name": name,
            "category": category,
            "price": price,
            "moq": moq,
            "specs": specs,
            "description": desc,
            "url": prod_url,
        }


# ══════════════════════════════════════════════════════════════════════════════
# AGENT 2 — IdentityAgent
# ══════════════════════════════════════════════════════════════════════════════

class IdentityAgent:

    async def run(self, profile_html: Optional[str], base_url: str, on_progress=None) -> dict:
        on_progress = on_progress or _noop_callback
        await on_progress("identity", "Extracting supplier identity...")

        if not profile_html:
            return {"company_name": "Unknown", "raw_confidence": 0.1}

        soup = BeautifulSoup(profile_html, "html.parser")
        for t in soup(["script", "style", "nav", "header", "footer", "iframe"]):
            t.decompose()
        text = soup.get_text("\n", strip=True)[:5000]

        prompt = f"""Extract supplier company info from this IndiaMART profile page.
URL: {base_url}
CONTENT:
{text}

Return ONLY this JSON:
{{
  "company_name": "", "trade_name": "",
  "location": {{"city":"","state":"","country":"India","pincode":"","address":""}},
  "business_type": [], "industry": "",
  "established_year": null, "employee_count": "", "annual_turnover": "",
  "gstin": "", "certifications": [], "export_capability": false,
  "contact": {{"phone":"","email":"","website":""}},
  "capabilities": {{
    "manufacturing":false,"customization":false,"private_label":false,
    "printing":false,"embroidery":false,"screen_print":false,"sublimation":false,"dtg":false
  }},
  "raw_confidence": 0.0
}}"""

        try:
            raw = await _call_llm(prompt, max_tokens=1500)
            d = _parse_json(raw)
            await on_progress("identity", f"Identified: {d.get('company_name', '?')}")
            return d
        except Exception:
            return {"company_name": "Unknown", "raw_confidence": 0.2}


# ══════════════════════════════════════════════════════════════════════════════
# AGENT 3 — EnricherAgent
# ══════════════════════════════════════════════════════════════════════════════

class EnricherAgent:

    async def run(self, raw_products: list, on_progress=None) -> list:
        on_progress = on_progress or _noop_callback

        if not raw_products:
            return []

        await on_progress("enrich", f"Enriching {len(raw_products)} products with AI...")

        enriched = []
        for i in range(0, len(raw_products), 5):
            batch = raw_products[i:i + 5]
            results = await self._enrich_batch(batch)
            enriched.extend(results)
            await on_progress("enrich", f"Enriched {min(i + 5, len(raw_products))}/{len(raw_products)} products")

        return enriched

    async def _enrich_batch(self, batch: list) -> list:
        batch_input = json.dumps([
            {
                "name": p.get("name", ""),
                "price_per_unit_inr": p.get("price"),
                "moq": p.get("moq"),
                "specs_raw": p.get("specs", {}),
                "description": p.get("description", "")[:300],
                "category": p.get("category", ""),
                "product_url": p.get("url", ""),
            }
            for p in batch
        ], ensure_ascii=False, indent=2)

        prompt = f"""Map these scraped IndiaMART products into structured fields.

Input:
{batch_input}

Return a JSON ARRAY. One object per product (same order):
[{{
  "name": "",
  "category": "T-Shirt/Hoodie/Polo/Sweatshirt/etc",
  "target_gender": "Men/Women/Kids/Unisex",
  "fabric_type": "Cotton/Polyester/etc from Fabric field",
  "fabric_composition": "100% Cotton / 60-40 blend",
  "gsm_range": {{"min": null, "max": null}},
  "fit": "Regular/Slim/Oversized/Drop Shoulder",
  "neck_type": "Round Neck/V Neck/Polo/Collar",
  "sleeve_type": "Half Sleeve/Full Sleeve/Sleeveless",
  "colors_available": ["from Colour field"],
  "sizes_available": ["S","M","L","XL from Available Sizes"],
  "printing_methods": ["Screen Printing","DTF","etc from Print Type"],
  "fabric_treatment": "Bio Washed/Pre-shrunk/etc",
  "price_per_unit_inr": null,
  "price_range": {{"min": null, "max": null}},
  "moq": null,
  "use_cases": ["Sports Wear","Casual Wear","etc from Ideal For"],
  "is_customizable": true,
  "product_url": "",
  "description": ""
}}]

Rules:
- GSM: "240 GSM" → min=240, max=240. "160-180 GSM" → min=160, max=180
- Print Type: split by comma → printing_methods array
- Available Sizes: split by comma → sizes_available array
- Colour field → colors_available array
- Ideal For → use_cases array
- Keep exact price_per_unit_inr and moq from input
- Return ONLY the JSON array"""

        try:
            raw = await _call_llm(prompt, max_tokens=2500)
            results = _parse_json_array(raw)
            for i, r in enumerate(results):
                if i < len(batch) and not r.get("product_url"):
                    r["product_url"] = batch[i].get("url", "")
            return [r for r in results if r.get("name")]
        except Exception:
            return [{
                "name": p.get("name", ""),
                "price_per_unit_inr": p.get("price"),
                "moq": p.get("moq"),
                "product_url": p.get("url", ""),
                "category": p.get("category", "T-Shirt"),
                "is_customizable": True,
                "gsm_range": {"min": None, "max": None},
                "colors_available": [],
                "sizes_available": [],
                "printing_methods": [],
            } for p in batch]


# ══════════════════════════════════════════════════════════════════════════════
# AGENT 4 — NormalizerAgent
# ══════════════════════════════════════════════════════════════════════════════

class NormalizerAgent:

    async def run(self, identity: dict, enriched_products: list, source_url: str, on_progress=None) -> dict:
        on_progress = on_progress or _noop_callback
        await on_progress("normalize", f"Normalizing {len(enriched_products)} products...")

        supplier = self._build_supplier(identity, source_url)
        catalog = [self._normalize_product(i, p) for i, p in enumerate(enriched_products)]

        await on_progress("normalize", "Applied quality tiers and pricing buckets")
        return {"supplier": supplier, "product_catalog": catalog}

    def _build_supplier(self, d: dict, url: str) -> dict:
        loc = d.get("location", {})
        return {
            "company_name": d.get("company_name", ""),
            "trade_name": d.get("trade_name", "") or d.get("company_name", ""),
            "location": {
                "city": loc.get("city", ""),
                "state": loc.get("state", ""),
                "country": loc.get("country", "India"),
                "pincode": loc.get("pincode", ""),
                "address": loc.get("address", ""),
            },
            "platform_sources": [{
                "platform": "IndiaMART",
                "profile_url": url,
                "confidence_score": round(float(d.get("raw_confidence", 0.7)), 2),
            }],
            "business_type": d.get("business_type", []),
            "industry": d.get("industry", ""),
            "established_year": d.get("established_year"),
            "employee_count": d.get("employee_count", ""),
            "annual_turnover": d.get("annual_turnover", ""),
            "gstin": d.get("gstin", ""),
            "certifications": d.get("certifications", []),
            "export_capability": d.get("export_capability", False),
            "contact": d.get("contact", {}),
            "capabilities": d.get("capabilities", {}),
        }

    def _normalize_product(self, i: int, p: dict) -> dict:
        gsm = self._gsm_val(p)
        price = p.get("price_per_unit_inr")
        moq = p.get("moq")
        return {
            "product_id": f"PROD-{i + 1:03d}",
            "product_name": p.get("name", ""),
            "product_url": p.get("product_url", ""),
            "category": p.get("category", "T-Shirt"),
            "target_gender": p.get("target_gender", "Unisex"),
            "description": p.get("description", ""),
            "specifications": {
                "fabric": {
                    "type": p.get("fabric_type", ""),
                    "composition": p.get("fabric_composition", ""),
                    "treatment": p.get("fabric_treatment", ""),
                    "confidence": 0.9 if p.get("fabric_type") else 0.3,
                },
                "gsm": {"value": gsm, "bucket": self._gsm_bucket(gsm), "confidence": 0.95 if gsm else 0.2},
                "fit": p.get("fit", ""),
                "neck_type": p.get("neck_type", ""),
                "sleeve_type": p.get("sleeve_type", ""),
                "color": p.get("colors_available", []),
            },
            "printing_capabilities": {
                "supported_methods": p.get("printing_methods", []),
                "default_method": (p.get("printing_methods") or [""])[0],
            },
            "sizes": {"available": p.get("sizes_available", []), "size_system": "Standard"},
            "commercials": {
                "price": {"value": price, "currency": "INR", "bucket": self._price_bucket(price), "confidence": 0.95 if price else 0.2},
                "moq": {"value": moq, "confidence": 0.95 if moq else 0.3},
            },
            "use_cases": p.get("use_cases", []),
            "agent_ready_fields": {
                "is_customizable": p.get("is_customizable", True),
                "supports_bulk": (moq or 0) >= 50,
                "quality_tier": self._quality_tier(gsm, price),
                "ideal_order_range": {"min": moq, "max": (moq or 50) * 20 if moq else None},
            },
        }

    def _gsm_val(self, p: dict) -> Optional[float]:
        r = p.get("gsm_range", {})
        if r.get("min") and r.get("max"):
            return (float(r["min"]) + float(r["max"])) / 2
        return float(r["min"]) if r.get("min") else float(r["max"]) if r.get("max") else None

    def _gsm_bucket(self, g: Optional[float]) -> str:
        if not g:
            return "unknown"
        for b, (lo, hi) in GSM_BUCKETS.items():
            if lo <= g < hi:
                return b
        return "premium" if g >= 180 else "low"

    def _price_bucket(self, p: Optional[float]) -> str:
        if not p:
            return "unknown"
        for b, (lo, hi) in PRICE_BUCKETS.items():
            if lo <= p < hi:
                return b
        return "premium"

    def _quality_tier(self, g: Optional[float], p: Optional[float]) -> str:
        s = 0
        if g:
            s += 2 if g >= 200 else 1 if g >= 170 else 0
        if p:
            s += 2 if p >= 400 else 1 if p >= 200 else 0
        return "premium" if s >= 3 else "standard" if s >= 1 else "budget"


# ══════════════════════════════════════════════════════════════════════════════
# AGENT 5 — ValidatorAgent
# ══════════════════════════════════════════════════════════════════════════════

class ValidatorAgent:

    async def run(self, normalized: dict, crawl_result: dict, on_progress=None) -> dict:
        on_progress = on_progress or _noop_callback
        await on_progress("validate", "Running quality checks...")

        sup = normalized.get("supplier", {})
        cat = normalized.get("product_catalog", [])
        categories = crawl_result.get("category_pages", [])

        ss = round(sum(1 for f in ["company_name", "location", "business_type", "industry", "contact"] if sup.get(f)) / 5, 2)
        cs = round(sum(self._product_completeness(p) for p in cat) / max(len(cat), 1), 2)
        ov = round((ss + cs) / 2, 2)
        gaps = self._find_gaps(sup, cat)

        final = {
            "supplier": sup,
            "product_catalog": cat,
            "extraction_metadata": {
                "source_url": crawl_result.get("url", ""),
                "categories_found": [c["category"] for c in categories],
                "crawled_at": datetime.utcnow().isoformat() + "Z",
                "quality_scores": {"supplier_completeness": ss, "catalog_completeness": cs, "overall": ov},
                "data_gaps": gaps,
                "total_products": len(cat),
            },
        }

        await on_progress("validate", f"Quality: {ov:.0%} | {len(cat)} products | {len(gaps)} gaps")
        return final

    def _product_completeness(self, p: dict) -> float:
        specs = p.get("specifications", {})
        commercials = p.get("commercials", {})
        fields = [
            bool(p.get("product_name")),
            bool(specs.get("fabric", {}).get("type")),
            bool(specs.get("gsm", {}).get("value")),
            bool(commercials.get("price", {}).get("value")),
            bool(commercials.get("moq", {}).get("value")),
            bool(p.get("sizes", {}).get("available")),
            bool(p.get("printing_capabilities", {}).get("supported_methods")),
            bool(specs.get("color")),
        ]
        return round(sum(fields) / len(fields), 2)

    def _find_gaps(self, sup: dict, cat: list) -> list:
        gaps = []
        if not sup.get("company_name"):
            gaps.append("company_name missing")
        if not sup.get("location", {}).get("city"):
            gaps.append("city missing")
        if not sup.get("contact", {}).get("phone"):
            gaps.append("phone missing/masked")
        if not sup.get("gstin"):
            gaps.append("GSTIN masked/missing")
        if not cat:
            gaps.append("no products extracted")
        else:
            no_price = [p["product_name"] for p in cat if not p.get("commercials", {}).get("price", {}).get("value")]
            no_moq = [p["product_name"] for p in cat if not p.get("commercials", {}).get("moq", {}).get("value")]
            if no_price:
                gaps.append(f"price missing: {len(no_price)} products")
            if no_moq:
                gaps.append(f"MOQ missing: {len(no_moq)} products")
        return gaps


# ══════════════════════════════════════════════════════════════════════════════
# ORCHESTRATOR — Main pipeline
# ══════════════════════════════════════════════════════════════════════════════

async def run_profile_pipeline(url: str, on_progress=None) -> dict:
    """
    Run the full 5-agent extraction pipeline on an IndiaMART URL.

    Args:
        url: IndiaMART supplier URL
        on_progress: async callback(stage, detail) for real-time status updates

    Returns:
        Final structured supplier + catalog JSON
    """
    on_progress = on_progress or _noop_callback

    url = _validate_url(url)

    if not _is_indiamart_url(url):
        raise ValueError("Only IndiaMART links are supported")

    # Stage 1: Crawl
    crawl_result = await CrawlerAgent().run(url, on_progress)

    # Collect + deduplicate + filter noise
    all_raw = []
    for cat_page in crawl_result.get("category_pages", []):
        all_raw.extend(cat_page.get("products", []))

    seen, deduped = set(), []
    for p in all_raw:
        key = (p.get("name", "") or "").lower().strip()[:50]
        if key and key not in seen and not _is_noise_product(p.get("name", "")):
            seen.add(key)
            deduped.append(p)

    await on_progress("crawl", f"{len(deduped)} unique products after filtering")

    # Stage 2: Identity extraction
    identity = await IdentityAgent().run(crawl_result.get("profile_html"), crawl_result.get("base_url", ""), on_progress)

    # Stage 3: LLM enrichment
    enriched = await EnricherAgent().run(deduped, on_progress)

    # Stage 4: Normalize
    normalized = await NormalizerAgent().run(identity, enriched, url, on_progress)

    # Stage 5: Validate
    final = await ValidatorAgent().run(normalized, crawl_result, on_progress)

    await on_progress("complete", "Pipeline complete!")
    return final


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC API — Used by onboarding endpoint
# ══════════════════════════════════════════════════════════════════════════════

async def build_profile_from_url(url: str, on_progress=None) -> dict:
    """Extract supplier profile from a single IndiaMART URL."""
    if not _is_indiamart_url(url):
        return {}
    return await run_profile_pipeline(url, on_progress)


async def build_profile_from_multiple_urls(urls: List[str], on_progress=None) -> dict:
    """Process URLs — only IndiaMART links are supported."""
    on_progress = on_progress or _noop_callback

    indiamart_urls = [u for u in urls if u and u.strip() and _is_indiamart_url(u.strip())]

    if not indiamart_urls:
        return {}

    # Use the first valid IndiaMART URL
    return await run_profile_pipeline(indiamart_urls[0], on_progress)


async def enrich_profile_with_gst(profile_data: dict, gst_data: dict) -> dict:
    """Merge GST API data into the extracted profile."""
    supplier = profile_data.get("supplier", {})

    supplier["legal_name"] = gst_data.get("lgnm", supplier.get("trade_name", ""))
    supplier["trade_name"] = gst_data.get("tradeNam", supplier.get("trade_name", ""))
    supplier["gst_status"] = gst_data.get("sts", "")
    supplier["registration_date"] = gst_data.get("rgdt", "")
    supplier["nature_of_business"] = gst_data.get("nba", [])

    pradr = gst_data.get("pradr", {})
    supplier["address"] = pradr.get("adr", supplier.get("location", {}).get("address", ""))
    addr_detail = pradr.get("addr", {})
    if addr_detail.get("stcd"):
        supplier.setdefault("location", {})["state"] = addr_detail["stcd"]
    if addr_detail.get("loc") or addr_detail.get("dst"):
        supplier.setdefault("location", {})["city"] = addr_detail.get("loc", addr_detail.get("dst", ""))
    if addr_detail.get("pncd"):
        supplier.setdefault("location", {})["pincode"] = addr_detail["pncd"]

    profile_data["supplier"] = supplier

    # Map to flat profile fields expected by onboarding
    catalog = profile_data.get("product_catalog", [])
    categories = list(set(p.get("category", "") for p in catalog if p.get("category")))
    metadata = profile_data.get("extraction_metadata", {})

    return {
        "supplier": supplier,
        "product_catalog": catalog,
        "extraction_metadata": metadata,
        # Flat fields for AgenticProfile model
        "product_categories": categories or metadata.get("categories_found", []),
        "capabilities": supplier.get("capabilities", {}),
        "pricing_bands": _extract_pricing_bands(catalog),
        "min_order_quantities": _extract_moqs(catalog),
        "certifications": supplier.get("certifications", []),
        "is_supplier": True,
        "is_buyer": False,
        "business_summary": None,
    }


async def generate_profile_summary(profile_data: dict) -> str:
    """Generate a business summary from the extracted profile."""
    supplier = profile_data.get("supplier", {})
    catalog = profile_data.get("product_catalog", [])
    categories = profile_data.get("product_categories", [])

    name = supplier.get("company_name") or supplier.get("trade_name", "This business")
    loc = supplier.get("location", {})
    city = loc.get("city", "")
    state = loc.get("state", "India")
    cats_str = ", ".join(categories[:4]) if categories else "various products"
    product_count = len(catalog)

    prompt = f"""Write a concise 2-3 sentence business summary for an AI sourcing agent.
Company: {name}
Location: {city}, {state}
Categories: {cats_str}
Products listed: {product_count}
Business type: {', '.join(supplier.get('business_type', []))}
Capabilities: {json.dumps(supplier.get('capabilities', {}))}

Write in third person. Focus on what they manufacture/sell, location, and strengths. Return ONLY the summary text."""

    try:
        messages = [{"role": "user", "content": [{"text": prompt}]}]
        return await call_qwen3(messages, system_prompt="You are a business analyst. Write concise summaries.", max_tokens=200)
    except Exception:
        return f"{name} is a B2B manufacturer based in {city}, {state}, specializing in {cats_str} with {product_count} listed products."


# ── Internal helpers ──────────────────────────────────────────────────────────

def _extract_pricing_bands(catalog: list) -> dict:
    bands = {}
    for p in catalog:
        cat = p.get("category", "General")
        price = p.get("commercials", {}).get("price", {}).get("value")
        if price:
            if cat not in bands:
                bands[cat] = {"min": price, "max": price, "unit": "per piece"}
            else:
                bands[cat]["min"] = min(bands[cat]["min"], price)
                bands[cat]["max"] = max(bands[cat]["max"], price)
    return bands


def _extract_moqs(catalog: list) -> dict:
    moqs = {}
    for p in catalog:
        cat = p.get("category", "General")
        moq = p.get("commercials", {}).get("moq", {}).get("value")
        if moq and cat not in moqs:
            moqs[cat] = {"quantity": moq, "unit": "pieces"}
    return moqs
