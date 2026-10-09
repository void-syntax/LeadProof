"""
Offline test of the decision layer (rules.py). No Gemini call, no API key, no cost.

Feeds hand-written "Gemini facts" for two test calls through rules.py and checks the result,
including one invented quote that must be dropped.

    python test_rules.py   ->  every line must say PASS
"""

from backend.config import load_json
from backend.rules import evaluate_call
from backend.schema import CallFacts

CALLS = {c["call_id"]: c for c in load_json("calls.json")["calls"]}
EXPECTED = load_json("expected.json")


def check(name, condition):
    print(("PASS " if condition else "FAIL ") + name)
    if not condition:
        raise SystemExit(1)


# C-014: what a correct Gemini answer looks like, plus ONE invented quote (price growth is not in the call)
C014 = {
    "intro": {"name_said": True, "project_said": True, "quote": "ЖК Demo Residence, меня зовут Рауф."},
    "budget": {"asked": False, "amount_azn": None, "quote": None},
    "payment": {"method": "unknown", "quote": None},
    "need": {"rooms": 2, "area_m2": None, "purpose": "unknown", "quote": "Вы оставляли заявку на двухкомнатную?"},
    "showroom": {"offered": False, "has_time": False, "discouraged": False, "quote": None},
    "next_step": {"type": "none", "when": None, "client_agreed": False, "quote": "Конечно, созвонимся."},
    "promises": [
        {"topic": "price_per_m2", "value": "2000", "condition": None, "quote": "Цены от 2 000 манат за метр."},
        {"topic": "completion_date", "value": "2027-06", "condition": None, "quote": "Сдача летом следующего года."},
        {"topic": "down_payment_pct", "value": "30", "condition": None, "quote": "первый взнос 30%"},
        {"topic": "discount", "value": None, "condition": None, "quote": "И скидочку вам подберём, не переживайте."},
        {"topic": "price_growth", "value": "15", "condition": None, "quote": "через полгода цена точно вырастет на 15%"},
    ],
    "lead": {"temperature": "hot", "quote": "Хотел узнать цену и когда сдача."},
    "translations": [],
    "summary_en": "Hot lead; handover date and discount promised outside the declaration.",
}

# C-016 (demo hero call): floor plans promised with no time must NOT count as a fixed next step
C016 = {
    "intro": {"name_said": True, "project_said": True, "quote": "Demo Residence, меня зовут Рауф."},
    "budget": {"asked": True, "amount_azn": 150000, "quote": "На какой бюджет рассчитываете?"},
    "payment": {"method": "unknown", "quote": None},
    "need": {"rooms": 2, "area_m2": None, "purpose": "living", "quote": "Хотим купить до Нового года, жить сами будем."},
    "showroom": {"offered": False, "has_time": False, "discouraged": False, "quote": None},
    "next_step": {"type": "send_floor_plans", "when": None, "client_agreed": True, "quote": "Да, отправлю вам планировки."},
    "promises": [{"topic": "price_growth", "value": "15", "condition": None,
                  "quote": "через полгода цена точно вырастет на 15%"}],
    "lead": {"temperature": "hot", "quote": "Хотим купить до Нового года"},
    "translations": [],
    "summary_en": "Hot lead; guaranteed price growth; floor plans with no time; no showroom invite.",
}

for call_id, facts in [("C-014", C014), ("C-016", C016)]:
    report = evaluate_call(CallFacts.model_validate(facts), CALLS[call_id])
    expected = EXPECTED[call_id]
    check(f"{call_id} criteria", report["statuses"] == expected["criteria"])
    check(f"{call_id} violations", sorted(v["topic"] for v in report["violations"]) == sorted(expected["violations"]))
    check(f"{call_id} actions", sorted(report["actions"]) == sorted(expected["actions"]))

check("C-014 invented quote dropped",
      [d["field"] for d in evaluate_call(CallFacts.model_validate(C014), CALLS["C-014"])["dropped"]] == ["promise:price_growth"])

# A positive fact without a quote is reset ("no evidence, no fact")
no_quote = dict(C014, showroom={"offered": True, "has_time": True, "discouraged": False, "quote": None})
report = evaluate_call(CallFacts.model_validate(no_quote), CALLS["C-014"])
check("showroom claim without a quote dropped", report["statuses"]["C5"] == "not_met"
      and any(d["field"] == "showroom" for d in report["dropped"]))

print("\nAll rule tests passed.")
