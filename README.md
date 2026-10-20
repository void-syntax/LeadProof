# LeadProof

**AI-powered sales call auditing for real estate developers.**

LeadProof audits sales calls against company regulations and project declarations, identifies potential violations, and provides evidence-backed findings for the Head of Sales (HoS) to review.

Instead of relying on random call sampling or keyword matching alone, LeadProof uses Gemini to extract structured facts from conversations and deterministic Python rules to verify evidence and evaluate compliance.

> **Core principle:** AI extracts the facts. Python verifies the evidence and applies the rules. Humans approve the actions.

## How It Works

```text
Sales Call
    |
    v
gemini.py
Extract facts, quotes, and token usage
    |
    v
rules.py
Verify quotes -> Evaluate C1-C6 -> Check promises
    |
    v
Generate findings and recommended actions
    |
    v
server.py
Expose results through an HTTP API
    |
    v
Dashboard -> Head of Sales review
```

### Why This Architecture?

- **Evidence-first analysis:** Findings must be supported by quotes from the original transcript.
- **Deterministic decisions:** Compliance criteria and action logic live in Python, not in the LLM prompt.
- **Separation of concerns:** AI extraction, rule evaluation, API delivery, and frontend presentation are independent components.
- **Cost awareness:** Token usage and estimated API costs are tracked during model calls.
- **Testability:** The decision layer can be tested without an API key, network requests, or AI inference.

## Features

- **Automated call auditing** — analyze sales conversations against defined company requirements.
- **Quote verification** — check extracted evidence against the original transcript before using it in a decision.
- **Criteria evaluation (C1–C6)** — apply explicit rules to evaluate call quality and compliance.
- **Promise verification** — compare sales representatives' promises against the project's official declaration.
- **Action recommendations** — generate findings and recommended follow-up actions for human review.
- **Structured AI output** — enforce a defined response schema for predictable downstream processing.
- **Cost and token tracking** — monitor inference usage while testing and tuning prompts.
- **Offline rule tests** — validate decision logic without calling Gemini.
- **Benchmarking** — compare agent results against a keyword-based baseline using a synthetic test set.
- **HTTP API** — serve audit results to the frontend.

## Architecture

| File | Responsibility |
|---|---|
| `config.py` | Loads regulations, project declarations, and keywords from `data/`. |
| `prompt.py` | Defines instructions for structured fact extraction. |
| `schema.py` | Defines the expected AI response schema. |
| `gemini.py` | Handles Gemini requests, retries, token usage, and cost estimation. |
| `rules.py` | Verifies quotes, evaluates C1–C6, checks promises, and determines recommended actions. |
| `test_rules.py` | Runs offline tests for the deterministic decision layer. |
| `test_run.py` | Runs the evaluation set, compares results with a keyword baseline, and tracks accuracy and cost. |
| `server.py` | Exposes the audit functionality and cached results through an HTTP API. |
| `API.md` | Documents the API endpoints and response formats. |
| `data/calls.json` | Contains 22 synthetic test calls. |
| `data/expected.json` | Contains expected results for evaluation; never passed to the agent. |

## Getting Started

### Requirements

- Python 3.10 or newer, subject to dependency compatibility
- A Gemini API key for live inference
- Dependencies listed in `requirements.txt`

### 1. Clone the repository

```bash
git clone https://github.com/void-syntax/LeadProof.git
cd LeadProof
```

Replace the repository URL if your project uses a different location.

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a local environment file:

```bash
cp .env.example .env
```

Add your Gemini API key to `.env`:

```env
GEMINI_API_KEY=your_api_key_here
```

Keep `.env` out of version control. Never hardcode API keys or commit secrets to the repository.

### 4. Run the offline tests

```bash
python test_rules.py
```

These tests validate the decision layer without making Gemini requests or incurring API costs. All tests should pass before running live evaluations.

### 5. Run a live evaluation

Test a single call:

```bash
python test_run.py C-016
```

Test multiple calls:

```bash
python test_run.py C-016 C-014
```

Run the complete synthetic evaluation set:

```bash
python test_run.py
```

The full run evaluates all 22 test calls and generates:

- `data/cached_results.json`
- `data/last_report.json`

Review these outputs to inspect the results, evaluation metrics, and estimated inference costs.

### 6. Start the API server

```bash
uvicorn server:app --reload
```

The API will be available at:

```text
http://localhost:8000
```

Refer to [`API.md`](API.md) for endpoint documentation and request/response examples.

## Model Configuration

Select the Gemini model through an environment variable:

```env
