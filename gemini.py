"""
One Gemini call: call transcript in, CallFacts out.

Env vars:
    GEMINI_MODEL    - optional, defaults to Gemini 3.8 Flash (check the exact name in AI Studio)

Usage:
    from gemini import extract_facts
    facts = extract_facts(call)   # call = one JSON from data/calls/
    if facts is None:
        status = "needs_review"
"""

import os
from typing import Optional
from api import KEY

from google import genai
from google.genai import types

from prompt import PROMPT, build_contents
from schema import CallFacts

MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")

_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=KEY)
    return _client


def extract_facts(call: dict, retries: int = 1) -> Optional[CallFacts]:
    """Returns validated CallFacts, or None after 1 + retries failed attempts."""
    contents = build_contents(call["started_at"][:10], call["segments"])
    config = types.GenerateContentConfig(
        system_instruction=PROMPT,
        response_mime_type="application/json",
        response_schema=CallFacts,
        # no temperature / top_p / top_k: Google recommends defaults for Gemini 3.x
    )
    for _ in range(retries + 1):
        try:
            response = _get_client().models.generate_content(
                model=MODEL, contents=contents, config=config
            )
            if isinstance(response.parsed, CallFacts):
                return response.parsed
            return CallFacts.model_validate_json(response.text)
        except Exception:
            continue  # bad JSON, schema mismatch or API error -> try again
    return None
