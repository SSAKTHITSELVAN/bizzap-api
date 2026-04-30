"""
AWS Bedrock client — calls the local Node.js proxy (server.js on port 3000)
which handles the Bedrock auth correctly.
Node proxy endpoint: POST http://localhost:3000/api/chat
"""
import httpx
import json
from typing import List, Optional

# Node proxy URL — your server.js running on port 3000
NODE_PROXY_URL = "http://localhost:3000/api/chat"


async def call_qwen3(
    messages: List[dict],
    system_prompt: Optional[str] = None,
    max_tokens: int = 400,
    temperature: float = 0.7,
    url_context: Optional[str] = None,
) -> str:
    """
    Call Qwen3 via the local Node.js proxy server (server.js).
    The proxy handles Bedrock Bearer auth correctly.
    POST { system, messages } → { text }
    """
    # Normalize messages to { role, content: string }
    # Node does: content: [{ text: String(m.content) }]
    # so we send content as plain string and let Node wrap it
    normalized = []
    for msg in messages:
        role    = msg.get("role", "user")
        content = msg.get("content", "")
        if isinstance(content, list):
            # flatten list content to string
            parts = [b.get("text", "") if isinstance(b, dict) else str(b) for b in content]
            content = " ".join(parts)
        normalized.append({"role": role, "content": str(content)})

    payload = {
        "system":   system_prompt or "",
        "messages": normalized,
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                NODE_PROXY_URL,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("text", "")

    except httpx.HTTPStatusError as e:
        raise Exception(f"Node proxy error {e.response.status_code}: {e.response.text}")
    except httpx.ConnectError:
        raise Exception("Node proxy not running. Start it with: node server.js")
    except Exception as e:
        raise Exception(f"Bedrock call failed: {str(e)}")


async def call_qwen3_with_url(url: str, instruction: str) -> str:
    messages = [
        {"role": "user", "content": f"Please visit and analyze this URL: {url}\n\n{instruction}"},
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
