"""
One Gemini call: call transcript in -> facts (CallFacts) + token usage and cost out.

    facts, usage = extract_facts(call)
    facts is None if Gemini never returned a valid answer -> the call goes to a human.
"""

import os
import time

from dotenv import load_dotenv
from google import genai
from google.genai import errors, types

from prompt import PROMPT, build_contents
from schema import CallFacts

# The key lives only in environment variables: Vercel env vars in production,
# a local .env file (git-ignored) on a laptop. Never in code or in the repo.
load_dotenv()
KEY = os.environ.get("GEMINI_API_KEY")
if not KEY:
    raise RuntimeError("GEMINI_API_KEY is not set: add it to Vercel env vars or to a local .env file")

# Switch the model with one env var, no code changes
MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")

# How much the model "thinks" before answering: minimal / low / medium / high.
# Less thinking = faster and cheaper; check accuracy with test_run.py before switching. Empty = model default.
THINKING = os.environ.get("GEMINI_THINKING", "").strip().upper()

# Google prices per 1M tokens in USD: (input, output). Thinking tokens are billed as output.
# Check the exact names of the cheaper models in AI Studio before switching.
PRICES = {
    "gemini-3.8-flash": (0.75, 3.75),
    "gemini-3.5-flash-lite": (0.30, 2.50),
    "gemini-3.1-flash-lite": (0.25, 1.50),
}
PRICE_IN, PRICE_OUT = PRICES.get(MODEL, PRICES["gemini-3.8-flash"])

# Client and config are created once, not per call
client = genai.Client(api_key=KEY)
CONFIG = types.GenerateContentConfig(
    system_instruction=PROMPT,
    response_mime_type="application/json",
    response_schema=CallFacts,  # Gemini must answer strictly in this schema
    thinking_config=types.ThinkingConfig(thinking_level=THINKING) if THINKING else None,
    # No temperature: Google recommends the defaults for Gemini 3.x
)


def extract_facts(call, retries=1):
    """Returns (facts, usage). Failed attempts cost money too, so every attempt is counted."""
    contents = build_contents(call["started_at"][:10], call["segments"])
    usage = {"model": MODEL, "thinking": THINKING or "default", "input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0}

    for attempt in range(1, retries + 2):
        try:
            response = client.models.generate_content(model=MODEL, contents=contents, config=CONFIG)
        except errors.APIError as e:
            print(f"  Gemini: API error {e.code} (attempt {attempt})")
            if e.code == 429:  # rate limit hit: wait, otherwise the retry fails too
                time.sleep(8)
            continue

        # Count the tokens of this attempt
        meta = response.usage_metadata
        if meta:
            usage["input_tokens"] += meta.prompt_token_count or 0
            usage["output_tokens"] += (meta.candidates_token_count or 0) + (meta.thoughts_token_count or 0)
        usage["cost_usd"] = round(
            (usage["input_tokens"] * PRICE_IN + usage["output_tokens"] * PRICE_OUT) / 1_000_000, 6
        )

        # The answer must match the schema; if not, try again
        try:
            if isinstance(response.parsed, CallFacts):
                return response.parsed, usage
            return CallFacts.model_validate_json(response.text), usage
        except ValueError as e:  # broken JSON or schema mismatch
            print(f"  Gemini: answer failed the schema (attempt {attempt}): {str(e)[:120]}")

    return None, usage
