import os
from typing import Any, Dict, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from gemini import extract_facts
from schema import CallFacts

app = FastAPI(title="LeadProof AI Call Audit Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AuditPayload(BaseModel):
    call: Optional[Dict[str, Any]] = None
    call_id: Optional[str] = None


def facts_to_extraction(facts: CallFacts) -> dict:
    """Transforms Gemini CallFacts into the Extraction schema expected by the LeadProof audit pipeline."""
    trans_map = {t.quote: t.en for t in facts.translations}

    def tr(q: Optional[str]) -> Optional[str]:
        return trans_map.get(q, q) if q else None

    c1_met = facts.intro.name_said and facts.intro.project_said
    c2_met = facts.budget.asked and (facts.budget.amount_azn is not None)
    c3_met = facts.payment.method in ("cash", "installment", "mortgage")
    c4_met = (facts.need.rooms is not None or facts.need.area_m2 is not None) and facts.need.purpose in ("living", "investment")
    c5_met = facts.showroom.offered and facts.showroom.has_time and not facts.showroom.discouraged
    c6_met = facts.next_step.client_agreed and facts.next_step.type != "none" and bool(facts.next_step.when)

    # Check non-target rule (e.g. wrong number / cold client with no interest)
    is_non_target = facts.lead.temperature == "cold" and (
        (facts.intro.quote and any(w in facts.intro.quote.lower() for w in ("səhv", "ошиблись", "не туда", "wrong number")))
        or (facts.summary_en and "wrong number" in facts.summary_en.lower())
    )

    criteria = [
        {
            "id": "C1",
            "status": "met" if c1_met else "not_met",
            "evidence_quote": facts.intro.quote,
            "quote_en": tr(facts.intro.quote),
            "confidence": 0.96,
            "reason": "Named self and project." if c1_met else "Did not name both self and project.",
        },
        {
            "id": "C2",
            "status": "not_applicable" if is_non_target else ("met" if c2_met else "not_met"),
            "evidence_quote": facts.budget.quote,
            "quote_en": tr(facts.budget.quote),
            "confidence": 0.94,
            "reason": "Non-target call." if is_non_target else ("Asked budget and client gave figure." if c2_met else "Budget not clarified."),
        },
        {
            "id": "C3",
            "status": "not_applicable" if is_non_target else ("met" if c3_met else "not_met"),
            "evidence_quote": facts.payment.quote,
            "quote_en": tr(facts.payment.quote),
            "confidence": 0.92,
            "reason": "Non-target call." if is_non_target else ("Payment method clarified." if c3_met else "Payment method not clarified."),
        },
        {
            "id": "C4",
            "status": "not_applicable" if is_non_target else ("met" if c4_met else "not_met"),
            "evidence_quote": facts.need.quote,
            "quote_en": tr(facts.need.quote),
            "confidence": 0.93,
            "reason": "Non-target call." if is_non_target else ("Rooms/area and purpose clarified." if c4_met else "Need not fully clarified."),
        },
        {
            "id": "C5",
            "status": "not_applicable" if is_non_target else ("met" if c5_met else "not_met"),
            "evidence_quote": facts.showroom.quote,
            "quote_en": tr(facts.showroom.quote),
            "confidence": 0.94,
            "reason": "Non-target call." if is_non_target else ("Showroom visit offered with day/time." if c5_met else "No concrete showroom invitation with time."),
        },
        {
            "id": "C6",
            "status": "not_applicable" if is_non_target else ("met" if c6_met else "not_met"),
            "evidence_quote": facts.next_step.quote,
            "quote_en": tr(facts.next_step.quote),
            "confidence": 0.93,
            "reason": "Non-target call." if is_non_target else ("Concrete next step agreed." if c6_met else "Next step not fixed or agreed."),
        },
    ]

    promises = []
    for p in facts.promises:
        norm = None
        if p.value is not None:
            try:
                norm = float(p.value) if "." in p.value else int(p.value)
            except ValueError:
                norm = p.value
        promises.append({
            "topic": p.topic,
            "normalized": norm,
            "condition": p.condition,
            "quote": p.quote,
            "quote_en": tr(p.quote),
        })

    lead = {
        "temperature": facts.lead.temperature,
        "evidence_quote": facts.lead.quote,
        "evidence_en": tr(facts.lead.quote),
        "budget": {"value": f"Up to {facts.budget.amount_azn:,.0f} AZN", "source": "client"} if facts.budget.amount_azn else None,
        "rooms": {"value": str(facts.need.rooms), "source": "client"} if facts.need.rooms else None,
        "payment": {"value": facts.payment.method.capitalize(), "source": "client"} if facts.payment.method != "unknown" else None,
        "objection": None,
        "timeline": None,
    }

    next_step = {
        "agreed": facts.next_step.client_agreed,
        "type": facts.next_step.type,
        "when": facts.next_step.when,
        "quote": facts.next_step.quote,
        "quote_en": tr(facts.next_step.quote),
    }

    return {
        "criteria": criteria,
        "promises": promises,
        "lead": lead,
        "next_step": next_step,
        "summary_en": facts.summary_en,
    }


@app.get("/")
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "leadproof-python-audit"}


@app.post("/audit")
def audit_call_endpoint(payload: AuditPayload):
    call_data = payload.call
    if not call_data:
        raise HTTPException(status_code=400, detail="Missing 'call' object in request body")

    if "started_at" not in call_data or "segments" not in call_data:
        raise HTTPException(
            status_code=400,
            detail="Invalid call object: 'started_at' and 'segments' are required",
        )

    facts = extract_facts(call_data)
    if facts is None:
        raise HTTPException(
            status_code=502,
            detail="Gemini fact extraction failed or timed out after retries",
        )

    extraction = facts_to_extraction(facts)
    return {
        "status": "ok",
        "facts": facts.model_dump(),
        "extraction": extraction,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
