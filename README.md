# LeadProof

Audits every sales call of a real estate developer. Gemini extracts facts with quotes, code verifies every quote and makes the decision, the head of sales approves the action.

```
call -> gemini.py (facts + tokens) -> rules.py (quote check -> criteria -> promises -> actions) -> server.py (API)
```

## Files

| File | What it does |
| --- | --- |
| `config.py` | Loads the regulation, declaration and keywords from `data/` |
| `prompt.py`, `schema.py` | Gemini prompt and the strict answer schema |
| `gemini.py` | One Gemini call: facts, tokens, cost, retry on errors |
| `rules.py` | All decisions: quote check, criteria C1–C6, promises vs declaration, actions |
| `test_rules.py` | Offline test of the decision layer: no Gemini, no key, no cost |
| `test_run.py` | Test set run: agent vs keyword script, accuracy and cost |
| `server.py` | HTTP API for the frontend (see `API.md`) |
| `data/calls.json`, `data/expected.json` | 22 synthetic test calls and the answer key (never passed to the agent) |

## Key

The Gemini key lives only in environment variables: `GEMINI_API_KEY` in Vercel env vars, or in a local `.env` (git-ignored, see `.env.example`). Never in code or in the repo.

## Run

```bash
pip install -r requirements.txt
cp .env.example .env              # then put the key into .env
python test_rules.py              # offline rule tests: every line must say PASS
python test_run.py C-016          # one live call: check that everything works
python test_run.py C-016 C-014    # a few calls while tuning the prompt (cheap)
python test_run.py                # all 22 calls -> data/cached_results.json and data/last_report.json
uvicorn server:app --reload       # API for the frontend at http://localhost:8000
```

Switch the model: `GEMINI_MODEL=gemini-3.5-flash-lite python test_run.py` (prices in `gemini.py`, `PRICES`).

## Deploy (Vercel)

Vercel picks up `server.py` automatically. Set `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) in Project → Settings → Environment Variables. Commit `data/cached_results.json` and `data/last_report.json` after the full run: the API serves them, the Vercel filesystem is read-only.

## Rules

- Gemini requests one at a time, never in parallel.
- Decisions only in `rules.py`, never in the prompt.
- Do not change `expected.json` and never pass it to the agent.
