"""
HTTP API for the frontend. The frontend computes nothing itself — it only reads ready results from here.

Local run:  uvicorn server:app --reload   (http://localhost:8000, docs at /docs)
On Vercel this file is picked up automatically (FastAPI instance named `app` in server.py).

GET  /health   — the server is alive (call it before the demo to wake the hosting up)
GET  /calls    — all calls with their lines, for the screen
GET  /results  — saved agent answers from the last full run (instant and free)
GET  /report   — test results: agent vs keyword script, cost, failures
POST /audit    — {"call_id": "C-016"}: audit a call live through Gemini right now
"""

import json
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.config import DATA_DIR, load_json
from backend.gemini import extract_facts
from backend.rules import evaluate_call

app = FastAPI(title="LeadProof API")

# The frontend lives on another domain: allow the browser to call this API
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

CALLS = {call["call_id"]: call for call in load_json("calls.json")["calls"]}


def read_saved(filename):
    """A file in data/ written by test_run.py. No run yet -> empty answer."""
    path = DATA_DIR / filename
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


class AuditRequest(BaseModel):
    call_id: str


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/calls")
def calls():
    return list(CALLS.values())


@app.get("/results")
def results():
    return read_saved("cached_results.json")


@app.get("/report")
def report():
    return read_saved("last_report.json")


@app.post("/audit")
def audit(request: AuditRequest):
    call = CALLS.get(request.call_id)
    if call is None:
        raise HTTPException(status_code=404, detail="Call not found")

    started = time.time()
    facts, usage = extract_facts(call)

    if facts is None:
        # Gemini did not answer in the schema: return the saved real answer if there is one
        saved = read_saved("cached_results.json").get(request.call_id)
        if saved:
            return {**saved, "source": "saved"}
        result = {"call_id": request.call_id, "status": "needs_review", "actions": ["NEEDS_REVIEW"], "dropped": []}
    else:
        result = evaluate_call(facts, call)

    result.update(usage=usage, latency_ms=int((time.time() - started) * 1000), source="live")
    return result
