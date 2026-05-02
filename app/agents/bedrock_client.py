"""
AWS Bedrock client — direct call to Bedrock runtime.
Same request structure as the working Node.js proxy.
"""
import httpx
import json
import os
from pathlib import Path
from typing import List, Optional

BEDROCK_REGION = "us-west-2"
MODEL_ID       = "qwen.qwen3-vl-235b-a22b"
BEDROCK_URL    = f"https://bedrock-runtime.{BEDROCK_REGION}.amazonaws.com/model/{MODEL_ID}/converse"

# Load .env from project root (bisdom/.env)
# parents[2] = project root regardless of OS
_env_path = Path(__file__).resolve().parents[2] / ".env"
if _env_path.exists():
    for _line in _env_path.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _, _v = _line.partition("=")
            _k = _k.strip()
            _v = _v.strip().strip('"').strip("'")  # remove quotes if present
            if _k not in os.environ:
                os.environ[_k] = _v

BEARER_TOKEN = os.environ.get("AWS_BEARER_TOKEN_BEDROCK", "").strip()

# Fail fast at startup if token is missing
if not BEARER_TOKEN:
    import warnings
    warnings.warn("AWS_BEARER_TOKEN_BEDROCK is not set — Bedrock calls will fail")


async def call_qwen3(
    messages: List[dict],
    system_prompt: Optional[str] = None,
    max_tokens: int = 400,
    temperature: float = 0.7,
    url_context: Optional[str] = None,
) -> str:
    if not BEARER_TOKEN:
        raise Exception("AWS_BEARER_TOKEN_BEDROCK not set in environment or .env file")

    # Normalize messages — content must be [{"text": str}]
    normalized = []
    for msg in messages:
        role    = msg.get("role", "user")
        content = msg.get("content", "")
        if isinstance(content, list):
            parts = [b.get("text", "") if isinstance(b, dict) else str(b) for b in content]
            content = " ".join(parts)
        normalized.append({
            "role":    role,
            "content": [{"text": str(content)}],
        })

    body: dict = {
        "messages": normalized,
        "inferenceConfig": {
            "maxTokens":   max_tokens,
            "temperature": temperature,
            "topP":        0.9,
        },
    }
    if system_prompt:
        body["system"] = [{"text": system_prompt}]

    body_bytes = json.dumps(body).encode("utf-8")

    headers = {
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {BEARER_TOKEN}",
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                BEDROCK_URL,
                headers=headers,
                content=body_bytes,
            )
            response.raise_for_status()
            data = response.json()
            return (
                data.get("output", {})
                    .get("message", {})
                    .get("content", [{}])[0]
                    .get("text", "")
            )

    except httpx.HTTPStatusError as e:
        raise Exception(f"Bedrock API error {e.response.status_code}: {e.response.text}")
    except Exception as e:
        raise Exception(f"Bedrock call failed: {str(e)}")


async def call_qwen3_with_url(url: str, instruction: str) -> str:
    messages = [
        {"role": "user", "content": [{"text": f"Please visit and analyze this URL: {url}\n\n{instruction}"}]},
    ]
    return await call_qwen3(
        messages,
        system_prompt="You are a business intelligence agent. Extract all relevant business information. Return structured JSON only.",
        max_tokens=3000,
    )


def build_chat_messages(history: List[dict], new_message: str) -> List[dict]:
    messages = []
    for msg in history:
        role    = msg.get("role", "user")
        content = msg.get("content", "")
        if isinstance(content, list):
            parts = [b.get("text", "") if isinstance(b, dict) else str(b) for b in content]
            content = " ".join(parts)
        if role in ("user", "human_buyer", "human_supplier"):
            messages.append({"role": "user",      "content": str(content)})
        elif role in ("assistant", "ai_buyer", "ai_supplier"):
            messages.append({"role": "assistant", "content": str(content)})
    messages.append({"role": "user", "content": new_message})
    return messages
