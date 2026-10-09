# LeadProof API — for the frontend

The frontend computes nothing: every decision comes from this API. The frontend shows the result and lets the head of sales press Approve.

Run the backend: `pip install -r requirements.txt`, then `uvicorn server:app --reload` → `http://localhost:8000`. Live docs with every field: `http://localhost:8000/docs`.

## Endpoints

| Method | Path | Returns | When to call |
| --- | --- | --- | --- |
| GET | `/health` | `{"ok": true}` | Check the server is alive |
| GET | `/calls` | List of calls: `call_id`, `manager`, `started_at`, `language`, `segments[{t, speaker, text}]` | On page load |
| GET | `/results` | Object `{"C-001": result, ...}`: saved real agent answers from the last full run | On page load: render every card at once, no waiting, no cost |
| POST | `/audit` | Body `{"call_id": "C-016"}` → one call's result, computed live | "Run live" button on the selected call |
| GET | `/report` | `{"summary": ..., "rows": [...]}`: test results | Test tab |
| GET | `/stress` | Same format as `/report`, for the 10 hard holdout calls (S-01…S-10) | Test tab, second table: failures shown openly |

## How the screen uses it

1. On load: `GET /calls` and `GET /results`. Render each card from `/results` with a "Saved run" badge.
2. "Run live": `POST /audit` → replace the card with the answer, badge "Live · {latency_ms/1000} s · ${usage.cost_usd}".
3. Test tab: `GET /report` → `summary` on top, `rows` as a table below. Then the same for `GET /stress` ("Stress test: 10 hard calls"). Never hide failed rows.

Rules:
- `/audit` takes 10–30 seconds (measured average ~30 s): show progress steps, 60-second timeout (the server allows 60). On timeout or error show the `/results` entry for that call with the "Saved run" badge.
- `/results`, `/report`, `/stress` return `{}` until the backend has committed a run: show an empty state, do not crash.
- No parallel `/audit` calls: one at a time.
- No scoring, violation or action logic in the frontend: display only.

## Result fields

| Field | Meaning | How to show |
| --- | --- | --- |
| `status` | `ok` or `needs_review` | With `needs_review` only `call_id`, `status`, `actions: ["NEEDS_REVIEW"]` exist: show "Needs human review" instead of the card |
| `source` | `live` or `saved` (`/audit` only) | Live or Saved run badge |
| `score_pct` | Score 0–100 | Large, in the card header |
| `criteria[]` | `id`, `name`, `status` (`met` / `not_met` / `not_applicable`), `weight` | C1–C6 checklist |
| `violations[]` | `topic`, `value`, `quote`, `reason`: promises outside the declaration | Red flags: quote + reason |
| `needs_review[]` | Promises the code could not verify | Yellow "check manually" notes |
| `dropped[]` | `field`, `quote`, `reason`: facts the AI claimed but whose quote is not in the call | "N AI claims discarded": this is our hallucination guard, always show it |
| `lead_temperature` | `hot` / `warm` / `cold` | Lead badge |
| `actions[]` | Action codes for the head of sales | Approve buttons, texts below |
| `summary_en` | One sentence about the call | Under the header |
| `facts` | Gemini facts with quotes | Quote highlighting, lead data |
| `usage` | `model`, `input_tokens`, `output_tokens`, `cost_usd` | Small: audit cost |
| `latency_ms` | Audit time | Small |

Quote highlighting: every quote in `facts.*.quote` and `facts.promises[].quote` is guaranteed to sit inside one line (`segments[].text`); search case-insensitively. English translations are in `facts.translations[]` (`quote` → `en`): show on hover.

Lead data for the card: budget `facts.budget.amount_azn`, rooms `facts.need.rooms`, payment `facts.payment.method`, purpose `facts.need.purpose`.

## Action texts

| Code | Button text |
| --- | --- |
| `CORRECT_PROMISE` | Call back today and correct the promise |
| `CALLBACK_TODAY` | Call back today and agree a concrete next step |
| `INVITE_SHOWROOM` | Invite to the showroom with a specific day and time |
| `COACHING` | Add to the coaching review with the manager |
| `OK` | No action needed |
| `NEEDS_REVIEW` | Needs human review |

## `/report`

`summary`: `model`, `calls`, `agent_accuracy` ("20/22"), `baseline_accuracy`, `agent_by_language`, `needs_review`, `dropped_quotes`, `total_cost_usd`, `cost_per_call_usd`, `avg_latency_s`.

`rows[]`: `call_id`, `language`, `scenario`, `expected`, `agent`, `baseline` (action lists), `agent_ok`, `baseline_ok`, `violations`, `expected_violations`, `dropped`, `cost_usd`, `latency_ms`.

Metrics on top: agent accuracy, keyword script accuracy, run cost. Table: call, language, expected, agent, script, match.

## Example `POST /audit` answer (C-016, the demo hero call)

```json
{
  "call_id": "C-016",
  "status": "ok",
  "criteria": [
    {
      "id": "C1",
      "name": "Introduced self and project",
      "status": "met",
      "weight": 1
    },
    {
      "id": "C2",
      "name": "Asked about budget",
      "status": "met",
      "weight": 2
    },
    {
      "...": "C3–C6, same shape"
    }
  ],
  "statuses": {
    "C1": "met",
    "C2": "met",
    "C3": "not_met",
    "C4": "met",
    "C5": "not_met",
    "C6": "not_met"
  },
  "score": 5,
  "max_score": 13,
  "score_pct": 38,
  "needs_coaching": true,
  "violations": [
    {
      "topic": "price_growth",
      "value": "15",
      "quote": "через полгода цена точно вырастет на 15%",
      "reason": "Price growth cannot be guaranteed"
    }
  ],
  "needs_review": [],
  "dropped": [],
  "lead_temperature": "hot",
  "active_lead": true,
  "actions": [
    "CORRECT_PROMISE",
    "CALLBACK_TODAY",
    "INVITE_SHOWROOM",
    "COACHING"
  ],
  "summary_en": "Hot lead for a 2-room flat to live in, budget 150,000 AZN; manager guaranteed price growth, promised floor plans with no time, no showroom invite.",
  "facts": {
    "intro": {
      "name_said": true,
      "project_said": true,
      "quote": "Demo Residence, меня зовут Рауф."
    },
    "budget": {
      "asked": true,
      "amount_azn": 150000.0,
      "quote": "На какой бюджет рассчитываете?"
    },
    "...": "payment, need, showroom, next_step: same shape, fields + quote",
    "promises": [
      {
        "topic": "price_growth",
        "value": "15",
        "condition": null,
        "quote": "через полгода цена точно вырастет на 15%"
      }
    ],
    "lead": {
      "temperature": "hot",
      "quote": "Хотим купить до Нового года"
    },
    "translations": [
      {
        "quote": "через полгода цена точно вырастет на 15%",
        "en": "in six months the price will definitely go up by 15%"
      },
      {
        "quote": "Да, отправлю вам планировки.",
        "en": "Yes, I'll send you the floor plans."
      }
    ],
    "summary_en": "Hot lead for a 2-room flat to live in, budget 150,000 AZN; manager guaranteed price growth, promised floor plans with no time, no showroom invite."
  },
  "usage": {
    "model": "gemini-3.8-flash",
    "input_tokens": 4100,
    "output_tokens": 2150,
    "cost_usd": 0.011137
  },
  "latency_ms": 6400,
  "source": "live"
}
```
