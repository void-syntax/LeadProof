"""
Deterministic decision layer. No AI here.

Order for one call:
1. verify_quotes     — drop facts whose quote is not in the transcript (protection against hallucinations);
2. evaluate_criteria — criteria C1–C6 and the score;
3. check_promises    — manager promises vs the project declaration;
4. decide_actions    — what the head of sales should do today.
All limits come from data/*.json, none are hard-coded.
"""

import re
import unicodedata

from config import DECLARATION, REGULATIONS


# ---------- Helpers ----------

def to_number(value):
    """'3', '3%', '2 000', '36 months' -> number. No number -> None."""
    if value is None:
        return None
    match = re.search(r"\d+(?:[.,]\d+)?", str(value).replace(" ", "").replace(" ", ""))
    return float(match.group().replace(",", ".")) if match else None


def normalize(text):
    """Lowercase, no punctuation, single spaces — so quotes can be compared with the transcript."""
    text = unicodedata.normalize("NFKC", text or "").lower().replace("ё", "е")
    text = re.sub(r"[^\w\s]", " ", text).replace("_", " ")
    return re.sub(r"\s+", " ", text).strip()


# ---------- 1. Quote verification ----------

# "Nothing was said" values. A fact that differs from them claims something and must have a quote.
NEUTRAL = {
    "intro": {"name_said": False, "project_said": False},
    "budget": {"asked": False, "amount_azn": None},
    "payment": {"method": "unknown"},
    "need": {"rooms": None, "area_m2": None, "purpose": "unknown"},
    "showroom": {"offered": False, "has_time": False, "discouraged": False},
    "next_step": {"type": "none", "when": None, "client_agreed": False},
}


def verify_quotes(facts, segments):
    """No quote in the call — no fact. Returns what was dropped (a metric for the tests)."""
    lines = [normalize(s["text"]) for s in segments]

    def found(quote):
        q = normalize(quote)
        return bool(q) and any(q in line for line in lines)  # a quote is a piece of ONE line

    dropped = []

    for section, neutral in NEUTRAL.items():
        part = getattr(facts, section)
        claims = any(getattr(part, key) != value for key, value in neutral.items())

        if part.quote and found(part.quote):
            continue  # quote found — fact confirmed
        if not part.quote and not claims:
            continue  # nothing is claimed — nothing to check

        dropped.append({
            "field": section,
            "quote": part.quote,
            "reason": "quote not found in the call" if part.quote else "fact without a quote",
        })
        for key, value in neutral.items():  # reset the fact to "not said"
            setattr(part, key, value)
        part.quote = None

    kept = []
    for promise in facts.promises:
        if found(promise.quote):
            kept.append(promise)
        else:
            dropped.append({"field": f"promise:{promise.topic}", "quote": promise.quote,
                            "reason": "quote not found in the call"})
    facts.promises = kept

    return dropped


# ---------- 2. Criteria and score ----------

def score(statuses):
    """Score 0–100 over applicable criteria only (met weight / applicable weight)."""
    weights = {c["id"]: c["weight"] for c in REGULATIONS["criteria"]}
    applicable = [cid for cid, status in statuses.items() if status != "not_applicable"]
    max_score = sum(weights[cid] for cid in applicable)
    points = sum(weights[cid] for cid in applicable if statuses[cid] == "met")
    pct = round(points / max_score * 100) if max_score else 100
    return points, max_score, pct


def evaluate_criteria(facts):
    """Criteria C1–C6 from the facts. Cold lead or wrong number -> only C1 is judged."""
    checks = {
        "C1": facts.intro.name_said and facts.intro.project_said,
        "C2": facts.budget.asked and facts.budget.amount_azn is not None,
        "C3": facts.payment.method != "unknown",
        "C4": (facts.need.rooms is not None or facts.need.area_m2 is not None)
              and facts.need.purpose != "unknown",
        "C5": facts.showroom.offered and facts.showroom.has_time and not facts.showroom.discouraged,
        "C6": facts.next_step.type != "none" and bool(facts.next_step.when) and facts.next_step.client_agreed,
    }
    cold = facts.lead.temperature == "cold"

    statuses = {}
    for item in REGULATIONS["criteria"]:
        cid = item["id"]
        if cold and cid != "C1":
            statuses[cid] = "not_applicable"
        else:
            statuses[cid] = "met" if checks[cid] else "not_met"

    points, max_score, pct = score(statuses)
    criteria = [
        {"id": c["id"], "name": c["name"], "status": statuses[c["id"]], "weight": c["weight"]}
        for c in REGULATIONS["criteria"]
    ]
    return {
        "criteria": criteria,
        "statuses": statuses,
        "score": points,
        "max_score": max_score,
        "score_pct": pct,
        "needs_coaching": pct < REGULATIONS["coaching_threshold"] and not cold,
    }


# ---------- 3. Promises vs declaration ----------

def check_promises(facts):
    """Every manager promise is checked against the declaration. Unclear ones go to a human, not to violations."""
    violations, needs_review = [], []

    for promise in facts.promises:
        topic, value, number = promise.topic, promise.value, to_number(promise.value)
        reason = None

        if topic == "discount":
            if number is None:
                reason = "Discount promised without a percentage"  # "we'll find you a discount" — the key case
            elif number > DECLARATION["discount_max_pct"]:
                reason = "Discount exceeds the allowed maximum"
            elif promise.condition != DECLARATION["discount_condition"]:
                reason = "Discount is not tied to 100% payment"

        elif topic == "completion_date":
            if not value or not re.fullmatch(r"\d{4}(-\d{2})?", value):
                needs_review.append({"topic": topic, "quote": promise.quote, "reason": "Date could not be parsed"})
                continue
            if value < DECLARATION["completion_from"]:  # 'YYYY-MM' strings compare like dates
                reason = "Handover date is earlier than declared"

        elif topic == "construction_start":
            declared = DECLARATION["construction_start"]
            if declared is None:
                reason = "Construction start date is not confirmed by the developer"
            elif value != declared:
                reason = "Construction start date differs from the declaration"

        elif topic == "price_growth":
            if not DECLARATION["price_growth_promises_allowed"]:
                reason = "Price growth cannot be guaranteed"

        elif topic == "mortgage_rate":
            if not DECLARATION["mortgage_rate_promises_allowed"]:
                reason = "Mortgage rate promises are not allowed"

        elif topic == "installment_months":
            if number is not None and number > DECLARATION["installment_max_months"]:
                reason = "Installment term exceeds the allowed maximum"

        elif topic == "down_payment_pct":
            if number is not None and number < DECLARATION["down_payment_min_pct"]:
                reason = "Down payment is below the declared minimum"

        elif topic == "price_per_m2":
            if number is not None and number < DECLARATION["price_per_m2_min_azn"]:
                reason = "Price per m2 is below the declared minimum"

        elif topic == "other":
            needs_review.append({"topic": topic, "quote": promise.quote, "reason": "Needs manual review"})
            continue

        if reason:
            violations.append({"topic": topic, "value": value, "quote": promise.quote, "reason": reason})

    return {"violations": violations, "needs_review": needs_review}


# ---------- 4. Actions for the head of sales ----------

def decide_actions(statuses, violations, lead, score_pct):
    """Ready actions for today. Used by both the agent and the comparison script."""
    active = lead in REGULATIONS["active_leads"]
    actions = []
    if violations:
        actions.append("CORRECT_PROMISE")   # call back and correct the promise
    if active and statuses["C6"] == "not_met":
        actions.append("CALLBACK_TODAY")    # hot/warm lead with no next step
    if active and statuses["C5"] == "not_met":
        actions.append("INVITE_SHOWROOM")   # no showroom invite with a specific time
    if score_pct < REGULATIONS["coaching_threshold"] and lead != "cold":
        actions.append("COACHING")          # review the call with the manager
    return actions or ["OK"]


# ---------- Everything together ----------

def evaluate_call(facts, call):
    """Full report for one call. facts = Gemini answer, call = the original call with its lines."""
    dropped = verify_quotes(facts, call["segments"])
    criteria_report = evaluate_criteria(facts)
    promise_report = check_promises(facts)

    return {
        "call_id": call.get("call_id"),
        "status": "ok",
        **criteria_report,
        "violations": promise_report["violations"],
        "needs_review": promise_report["needs_review"],
        "dropped": dropped,
        "lead_temperature": facts.lead.temperature,
        "active_lead": facts.lead.temperature in REGULATIONS["active_leads"],
        "actions": decide_actions(criteria_report["statuses"], promise_report["violations"],
                                  facts.lead.temperature, criteria_report["score_pct"]),
        "summary_en": facts.summary_en,
        "facts": facts.model_dump(),
    }
