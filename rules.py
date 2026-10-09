from config import REGULATIONS, DECLARATION


def to_number(value):
    """Convert a value to a number safely."""
    if value is None:
        return None

    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def evaluate_criteria(facts):
    """Evaluate the six sales criteria using deterministic rules."""
    checks = {
        "C1": (
            facts.intro.name_said
            and facts.intro.project_said
        ),
        "C2": facts.budget.asked,
        "C3": facts.payment.method != "unknown",
        "C4": (
            (
                facts.need.rooms is not None
                or facts.need.area_m2 is not None
            )
            and facts.need.purpose != "unknown"
        ),
        "C5": (
            facts.showroom.offered
            and facts.showroom.has_time
        ),
        "C6": (
            facts.next_step.type != "none"
            and facts.next_step.client_agreed
        ),
    }

    criteria = []
    total_score = 0
    max_score = 0

    for item in REGULATIONS["criteria"]:
        criterion_id = item["id"]
        weight = item["weight"]
        passed = bool(checks.get(criterion_id, False))

        score = weight if passed else 0
        total_score += score
        max_score += weight

        criteria.append({
            "id": criterion_id,
            "name": item["name"],
            "passed": passed,
            "weight": weight,
            "score": score,
        })

    score_pct = (
        round(total_score / max_score * 100, 2)
        if max_score else 0
    )

    threshold = REGULATIONS["coaching_threshold"]

    return {
        "criteria": criteria,
        "score": total_score,
        "max_score": max_score,
        "score_pct": score_pct,
        "needs_coaching": score_pct < threshold,
    }


def check_promises(facts):
    """Compare manager promises with the project declaration."""
    violations = []
    needs_review = []

    for promise in facts.promises:
        topic = promise.topic
        value = promise.value
        number = to_number(value)
        reason = None

        if topic == "discount":
            if number is None:
                needs_review.append({
                    "topic": topic,
                    "quote": promise.quote,
                    "reason": "Discount amount is missing or invalid",
                })
                continue

            if number < 0:
                reason = "Discount cannot be negative"

            elif number > DECLARATION["discount_max_pct"]:
                reason = "Discount exceeds the allowed maximum"

            elif (
                DECLARATION["discount_condition"] == "full_payment"
                and promise.condition != "full_payment"
            ):
                reason = "Discount is not tied to full payment"

        elif topic == "completion_date":
            start = DECLARATION["completion_from"]

            if not value:
                needs_review.append({
                    "topic": topic,
                    "quote": promise.quote,
                    "reason": "Completion date is missing",
                })
                continue

            if value < start:
                reason = "Completion date is earlier than declared"

        elif topic == "construction_start":
            allowed_date = DECLARATION["construction_start"]

            if allowed_date is None:
                reason = "Construction start date is not declared"
            elif not value:
                needs_review.append({
                    "topic": topic,
                    "quote": promise.quote,
                    "reason": "Construction start date is missing",
                })
                continue
            elif value < allowed_date:
                reason = "Construction start date is earlier than declared"

        elif topic == "price_growth":
            if not DECLARATION["price_growth_promises_allowed"]:
                reason = "Price growth promises are prohibited"

        elif topic == "mortgage_rate":
            if not DECLARATION["mortgage_rate_promises_allowed"]:
                reason = "Mortgage rate promises are prohibited"

        elif topic == "installment_months":
            if number is None:
                needs_review.append({
                    "topic": topic,
                    "quote": promise.quote,
                    "reason": "Installment duration is missing or invalid",
                })
                continue

            if number < 0:
                reason = "Installment duration cannot be negative"
            elif number > DECLARATION["installment_max_months"]:
                reason = "Installment duration exceeds the allowed maximum"

        elif topic == "down_payment_pct":
            if number is None:
                needs_review.append({
                    "topic": topic,
                    "quote": promise.quote,
                    "reason": "Down payment percentage is missing or invalid",
                })
                continue

            if number < DECLARATION["down_payment_min_pct"]:
                reason = "Down payment is below the declared minimum"

        elif topic == "price_per_m2":
            if number is None:
                needs_review.append({
                    "topic": topic,
                    "quote": promise.quote,
                    "reason": "Price per m2 is missing or invalid",
                })
                continue

            if number < DECLARATION["price_per_m2_min_azn"]:
                reason = "Price per m2 is below the declared minimum"

        elif topic == "other":
            needs_review.append({
                "topic": topic,
                "quote": promise.quote,
                "reason": "Promise topic needs manual review",
            })
            continue

        if reason:
            violations.append({
                "topic": topic,
                "value": value,
                "quote": promise.quote,
                "reason": reason,
            })

    return {
        "violations": violations,
        "needs_review": needs_review,
    }


def evaluate_call(facts):
    """Build the complete audit report."""
    criteria_report = evaluate_criteria(facts)
    promise_report = check_promises(facts)

    return {
        **criteria_report,
        "violations": promise_report["violations"],
        "needs_review": promise_report["needs_review"],
        "lead_temperature": facts.lead.temperature,
        "active_lead": (
            facts.lead.temperature
            in REGULATIONS["active_leads"]
        ),
        "summary_en": facts.summary_en,
    }