"""
Test set run: the agent (Gemini + rules) vs a naive keyword script.

    python test_run.py                 # all 40 calls, one at a time with a pause
    python test_run.py C-016 C-014     # only these calls (cheap, for prompt debugging)
    python test_run.py --stress        # 10 hard holdout calls: the prompt is NOT tuned on them
    python test_run.py --from-cache    # rebuild last_report.json from cached_results.json, no Gemini calls, $0

Writes:
    data/cached_results.json  — real agent answers for the demo (full main run only)
    data/last_report.json     — metrics, cost and every failure (full main run only)
    data/partial_report.json  — the same for a run on selected calls (never overwrites the full report)
    data/stress_report.json   — the same for the stress set (never touches the demo files)
"""

import json
import sys
import time

from config import DATA_DIR, KEYWORDS, REGULATIONS, load_json
from gemini import MODEL, THINKING, extract_facts
from rules import decide_actions, evaluate_call, score

STRESS = "--stress" in sys.argv
FROM_CACHE = "--from-cache" in sys.argv  # reuse saved answers instead of calling Gemini
CALLS = load_json("stress_calls.json" if STRESS else "calls.json")["calls"]
EXPECTED = load_json("stress_expected.json" if STRESS else "expected.json")  # answer key: NEVER passed to the agent


def baseline_actions(call):
    """How calls are checked without AI: keyword search. Needed for the As-Is vs To-Be comparison."""
    text = " ".join(s["text"] for s in call["segments"]).lower()
    manager_lines = [s["text"].lower() for s in call["segments"] if s["speaker"] == "manager"]

    def has(words, line):
        return any(word.lower() in line for word in words)

    cold = has(KEYWORDS["cold"], text)
    statuses = {}
    for item in REGULATIONS["criteria"]:
        cid = item["id"]
        if cold and cid != "C1":
            statuses[cid] = "not_applicable"
        else:
            statuses[cid] = "met" if has(KEYWORDS[cid], text) else "not_met"

    violations = [topic for topic, words in KEYWORDS["violations"].items()
                  if any(has(words, line) for line in manager_lines)]
    _, _, pct = score(statuses)
    return decide_actions(statuses, violations, "cold" if cold else "warm", pct)


def cached_model(cached):
    return next((r["usage"].get("model") for r in cached.values() if r.get("usage")), MODEL)


def cached_thinking(cached):
    return next((r["usage"].get("thinking", "default") for r in cached.values() if r.get("usage")), "default")


def same(a, b):
    return sorted(a) == sorted(b)


def main():
    only = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
    saved = load_json("cached_results.json") if FROM_CACHE else {}
    calls = [c for c in CALLS if not only or c["call_id"] in only]
    rows, cached = [], {}
    total_cost, total_ms = 0.0, 0

    for n, call in enumerate(calls, 1):
        cid = call["call_id"]
        expected = EXPECTED[cid]
        if FROM_CACHE:  # saved answer from the last full run: same numbers, no new cost
            report = saved[cid]
            usage, latency_ms = report["usage"], report["latency_ms"]
        else:
            started = time.time()
            facts, usage = extract_facts(call)
            latency_ms = int((time.time() - started) * 1000)

            if facts is None:
                report = {"call_id": cid, "status": "needs_review", "actions": ["NEEDS_REVIEW"], "dropped": []}
            else:
                report = evaluate_call(facts, call)
            report["usage"], report["latency_ms"] = usage, latency_ms

        base = baseline_actions(call)
        row = {
            "call_id": cid,
            "language": expected["language"],
            "scenario": expected["scenario"],
            "expected": expected["actions"],
            "agent": report["actions"],
            "baseline": base,
            "agent_ok": same(report["actions"], expected["actions"]),
            "baseline_ok": same(base, expected["actions"]),
            "violations": [v["topic"] for v in report.get("violations", [])],
            "expected_violations": expected["violations"],
            "criteria_diff": {k: [v, report.get("statuses", {}).get(k)] for k, v in expected["criteria"].items()
                              if report.get("statuses", {}).get(k) != v},
            "dropped": report["dropped"],
            "cost_usd": usage["cost_usd"],
            "latency_ms": latency_ms,
        }
        rows.append(row)
        cached[cid] = report
        total_cost += usage["cost_usd"]
        total_ms += latency_ms

        print(f"[{n}/{len(calls)}] {cid} {row['language']:5} agent={'OK ' if row['agent_ok'] else 'MISS'} "
              f"script={'OK ' if row['baseline_ok'] else 'MISS'} {latency_ms / 1000:.1f} s ${usage['cost_usd']:.4f} "
              f"{report['actions']}")
        if n < len(calls) and not FROM_CACHE:
            time.sleep(1)  # one call at a time: parallel requests hit the API rate limit

    k = len(rows)
    by_language = {}
    for r in rows:
        ok, total = by_language.get(r["language"], (0, 0))
        by_language[r["language"]] = (ok + r["agent_ok"], total + 1)

    summary = {
        "set": "stress" if STRESS else "main",
        "model": cached_model(cached) if FROM_CACHE else MODEL,
        "thinking": cached_thinking(cached) if FROM_CACHE else (THINKING or "default"),
        "calls": k,
        "agent_accuracy": f"{sum(r['agent_ok'] for r in rows)}/{k}",
        "baseline_accuracy": f"{sum(r['baseline_ok'] for r in rows)}/{k}",
        "agent_by_language": {lang: f"{ok}/{total}" for lang, (ok, total) in sorted(by_language.items())},
        "needs_review": sum(r["agent"] == ["NEEDS_REVIEW"] for r in rows),
        "dropped_quotes": sum(len(r["dropped"]) for r in rows),
        "total_cost_usd": round(total_cost, 4),
        "cost_per_call_usd": round(total_cost / k, 5) if k else 0,
        "avg_latency_s": round(total_ms / k / 1000, 1) if k else 0,
    }

    report_file = "stress_report.json" if STRESS else "partial_report.json" if only else "last_report.json"
    (DATA_DIR / report_file).write_text(
        json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=2), encoding="utf-8")
    if not only and not STRESS and not FROM_CACHE:  # the demo cache is written only after a full live main run
        (DATA_DIR / "cached_results.json").write_text(json.dumps(cached, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n" + json.dumps(summary, ensure_ascii=False, indent=2))
    print("\nAgent failures (expected -> got):")
    for r in rows:
        if not r["agent_ok"]:
            trap = f" | trap: {EXPECTED[r['call_id']]['trap']}" if STRESS else ""
            print(f"- {r['call_id']} ({r['scenario']}): {r['expected']} -> {r['agent']}; "
                  f"criteria {r['criteria_diff']}; violations {r['violations']} instead of {r['expected_violations']}{trap}")


if __name__ == "__main__":
    main()
