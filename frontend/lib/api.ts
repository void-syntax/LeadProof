/**
 * Client for the LeadProof backend (see backend/API.md).
 *
 * The backend answers in its own format; this file converts every answer into the
 * types the UI components already use (lib/types.ts). No decisions are made here:
 * statuses, scores, violations and actions all come from the backend as is.
 *
 * No mock data: if the backend does not answer, the UI shows an empty state or an
 * error instead of made-up results.
 */

import type {
  ActionCode,
  AuditAction,
  AuditCardResult,
  Call,
  CriterionAudit,
  CriterionStatus,
  Language,
  TestReport,
  TestReportRow,
  Temperature,
} from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '')
const LIVE_TIMEOUT_MS = 60000 // the backend function may run up to 60 s on Vercel

// ---------- Backend shapes (only the fields we read) ----------

type RawFacts = {
  intro: { name_said: boolean; project_said: boolean; quote: string | null }
  budget: { asked: boolean; amount_azn: number | null; quote: string | null }
  payment: { method: string; quote: string | null }
  need: { rooms: number | null; area_m2: number | null; purpose: string; quote: string | null }
  showroom: { offered: boolean; has_time: boolean; discouraged: boolean; quote: string | null }
  next_step: { type: string; when: string | null; client_agreed: boolean; quote: string | null }
  lead: { temperature: Temperature; quote: string | null }
  translations: { quote: string; en: string }[]
  summary_en: string
}

type RawResult = {
  call_id: string
  status: 'ok' | 'needs_review'
  criteria?: { id: CriterionAudit['id']; name: string; status: CriterionStatus }[]
  score_pct?: number
  violations?: { topic: string; value: string | null; quote: string; reason: string }[]
  needs_review?: { topic: string; quote: string | null; reason: string }[]
  dropped?: { field: string; quote: string | null; reason: string }[]
  lead_temperature?: Temperature
  actions: string[]
  summary_en?: string
  facts?: RawFacts
  usage?: { cost_usd: number }
  latency_ms?: number
  source?: 'live' | 'saved'
}

type RawReport = {
  summary: { total_cost_usd?: number }
  rows: {
    call_id: string
    scenario: string
    language: Language | null
    expected: string[]
    agent: string[]
    baseline: string[]
    agent_ok: boolean
    baseline_ok: boolean
  }[]
}

// ---------- Display texts ----------

const ACTION_TITLE: Record<string, string> = {
  CORRECT_PROMISE: 'Call back today and correct the promise',
  CALLBACK_TODAY: 'Call back today and agree a concrete next step',
  INVITE_SHOWROOM: 'Invite to the showroom with a specific day and time',
  COACHING: 'Add to the coaching review with the manager',
  OK: 'No action needed',
}

const TOPIC_TITLE: Record<string, string> = {
  price_growth: 'Guaranteed price growth',
  discount: 'Discount',
  completion_date: 'Handover date',
  construction_start: 'Construction start',
  installment_months: 'Installment term',
  down_payment_pct: 'Down payment',
  price_per_m2: 'Price per m²',
  mortgage_rate: 'Mortgage rate',
  other: 'Other promise',
}

const NEXT_STEP_TITLE: Record<string, string> = {
  showroom_visit: 'Showroom visit',
  send_floor_plans: 'Send floor plans',
  callback: 'Callback',
}

const CRITERION_SECTION: Record<string, keyof RawFacts> = {
  C1: 'intro',
  C2: 'budget',
  C3: 'payment',
  C4: 'need',
  C5: 'showroom',
  C6: 'next_step',
}

function azn(amount: number | null): string | null {
  return amount ? `${Math.round(amount).toLocaleString('en-US')} AZN` : null
}

function capitalize(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text
}

function criterionReason(id: string, status: CriterionStatus, f?: RawFacts): string {
  if (status === 'not_applicable') return 'Not applicable: cold lead'
  const met = status === 'met'
  if (!f) return met ? 'Met' : 'Not met'

  switch (id) {
    case 'C1': {
      if (met) return 'Manager gave own name and the project'
      const missing = [!f.intro.name_said && 'own name not said', !f.intro.project_said && 'project not named']
      return capitalize(missing.filter(Boolean).join(', ')) || 'Not met'
    }
    case 'C2':
      if (met) return `Budget: ${azn(f.budget.amount_azn)}`
      return f.budget.asked ? 'Asked, but the client named no amount' : 'Budget not asked'
    case 'C3':
      return met ? `Payment: ${f.payment.method}` : 'Payment method not clarified by the client'
    case 'C4': {
      if (!met) return 'Rooms or area and purpose not clarified'
      const size = f.need.rooms ? `${f.need.rooms} rooms` : `${f.need.area_m2} m²`
      return `${size}, ${f.need.purpose}`
    }
    case 'C5':
      if (met) return 'Invited to the showroom with a specific time'
      if (f.showroom.discouraged) return 'Manager talked the client out of a visit'
      return f.showroom.offered ? 'Invited, but without a specific time' : 'No showroom invite'
    case 'C6': {
      const step = NEXT_STEP_TITLE[f.next_step.type]
      if (met) return `${step}, ${f.next_step.when}, client agreed`
      if (!step) return 'No concrete next step'
      if (!f.next_step.when) return `${step} without a day or time`
      return `${step} ${f.next_step.when}, but the client did not agree`
    }
    default:
      return met ? 'Met' : 'Not met'
  }
}

function actionWhy(code: string, raw: RawResult): string {
  switch (code) {
    case 'CORRECT_PROMISE':
      return (raw.violations ?? []).map((v) => v.reason).join('; ')
    case 'CALLBACK_TODAY':
      return `${capitalize(raw.lead_temperature ?? 'active')} lead without an agreed next step`
    case 'INVITE_SHOWROOM':
      return 'No showroom invite with a specific time'
    case 'COACHING':
      return `Script score ${raw.score_pct}%`
    default:
      return 'Script followed, no risky promises'
  }
}

// ---------- Converters ----------

export function toCard(raw: RawResult, runType: 'saved' | 'live'): AuditCardResult {
  const f = raw.facts
  const translations = new Map((f?.translations ?? []).map((t) => [t.quote, t.en]))
  const en = (quote: string | null | undefined) => (quote ? translations.get(quote) ?? null : null)

  const failed = raw.status === 'needs_review' || raw.actions.includes('NEEDS_REVIEW')
  const actions: AuditAction[] = raw.actions
    .filter((code) => code !== 'NEEDS_REVIEW')
    .map((code) => ({ code: code as ActionCode, title: ACTION_TITLE[code] ?? code, why: actionWhy(code, raw) }))

  const criteria: CriterionAudit[] = (raw.criteria ?? []).map((c) => {
    const section = f ? (f[CRITERION_SECTION[c.id]] as { quote?: string | null }) : undefined
    const quote = section?.quote ?? null
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      reason: criterionReason(c.id, c.status, f),
      quote,
      quote_en: en(quote),
    }
  })

  const temperature = raw.lead_temperature ?? f?.lead.temperature
  const live = runType === 'live' && raw.source !== 'saved'

  return {
    call_id: raw.call_id,
    status: failed ? 'needs_review' : 'ok',
    review_reason: failed ? 'The model did not return a valid answer for this call' : undefined,
    run_type: live ? 'live' : 'saved',
    duration_s: live && raw.latency_ms != null ? raw.latency_ms / 1000 : undefined,
    cost: live && raw.usage ? `$${raw.usage.cost_usd.toFixed(4)}` : undefined,
    score_pct: raw.score_pct ?? null,
    criteria,
    violations: (raw.violations ?? []).map((v) => ({
      topic: TOPIC_TITLE[v.topic] ?? v.topic,
      quote: v.quote,
      quote_en: en(v.quote),
      explanation: v.value ? `${v.reason} (said: ${v.value})` : v.reason,
    })),
    needs_review: (raw.needs_review ?? []).map((w) => ({
      topic: TOPIC_TITLE[w.topic] ?? w.topic,
      quote: w.quote,
      quote_en: en(w.quote),
      explanation: w.reason,
    })),
    dropped: (raw.dropped ?? []).map((d) => ({
      text: d.quote ? `${d.field}: “${d.quote}”` : d.field,
      reason: d.reason,
    })),
    lead:
      f && temperature
        ? {
            temperature,
            quote: f.lead.quote,
            quote_en: en(f.lead.quote),
            budget: azn(f.budget.amount_azn),
            rooms: f.need.rooms ? String(f.need.rooms) : f.need.area_m2 ? `${f.need.area_m2} m²` : null,
            payment: f.payment.method !== 'unknown' ? f.payment.method : null,
          }
        : null,
    summary_en: raw.summary_en ?? f?.summary_en ?? null,
    actions,
  }
}

export function toReport(raw: RawReport | Record<string, never> | null): TestReport | null {
  if (!raw || !('rows' in raw) || !Array.isArray(raw.rows) || raw.rows.length === 0) return null
  const rows: TestReportRow[] = raw.rows.map((r) => ({
    call_id: r.call_id,
    scenario: r.scenario,
    language: r.language ?? null,
    expected_actions: r.expected as ActionCode[],
    agent_actions: r.agent as ActionCode[],
    baseline_actions: r.baseline as ActionCode[],
    agent_match: Boolean(r.agent_ok),
    baseline_match: Boolean(r.baseline_ok),
  }))
  const total = rows.length
  const agent = rows.filter((r) => r.agent_match).length
  const baseline = rows.filter((r) => r.baseline_match).length
  const pct = (n: number) => `${Math.round((100 * n) / total)}%`
  return {
    agent_accuracy: pct(agent),
    agent_correct: agent,
    baseline_accuracy: pct(baseline),
    baseline_correct: baseline,
    total_cases: total,
    total_cost: `$${Number(raw.summary?.total_cost_usd ?? 0).toFixed(2)}`,
    rows,
  }
}

// ---------- Requests ----------

async function getJson<T>(path: string): Promise<T> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not set')
  const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`GET ${path} failed with status ${res.status}`)
  return (await res.json()) as T
}

/** All calls with their lines. Throws if the backend is unreachable. */
export async function getCalls(): Promise<Call[]> {
  const data = await getJson<Call[] | { calls: Call[] }>('/calls')
  return Array.isArray(data) ? data : data.calls ?? []
}

/** Saved agent answers from the last full run. Empty if the backend has none or is unreachable. */
export async function getResults(): Promise<Record<string, AuditCardResult>> {
  try {
    const data = await getJson<Record<string, RawResult>>('/results')
    return Object.fromEntries(Object.entries(data).map(([id, raw]) => [id, toCard(raw, 'saved')]))
  } catch (err) {
    console.error('[API] /results failed:', err)
    return {}
  }
}

/** Main test set report (40 calls). Null if there is no run or the backend is unreachable. */
export async function getReport(): Promise<TestReport | null> {
  try {
    return toReport(await getJson<RawReport>('/report'))
  } catch (err) {
    console.error('[API] /report failed:', err)
    return null
  }
}

/** Stress test report (10 hard holdout calls), same format as the main report. */
export async function getStressReport(): Promise<TestReport | null> {
  try {
    return toReport(await getJson<RawReport>('/stress'))
  } catch (err) {
    console.error('[API] /stress failed:', err)
    return null
  }
}

/** Audits one call live through Gemini. Throws on error or after 60 seconds. */
export async function auditLive(callId: string): Promise<AuditCardResult> {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not set')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS)
  try {
    const res = await fetch(`${API_URL}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ call_id: callId }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Live audit failed with status ${res.status}`)
    return toCard((await res.json()) as RawResult, 'live')
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Live audit timed out after ${LIVE_TIMEOUT_MS / 1000} seconds`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
