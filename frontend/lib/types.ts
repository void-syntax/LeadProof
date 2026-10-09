export type Language = 'ru' | 'az' | 'mixed' | 'en'
export type Speaker = 'manager' | 'client'
export type CriterionId = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6'
export type CriterionStatus = 'met' | 'not_met' | 'not_applicable'
export type Temperature = 'hot' | 'warm' | 'cold'
export type ActionCode = 'CORRECT_PROMISE' | 'CALLBACK_TODAY' | 'INVITE_SHOWROOM' | 'COACHING' | 'OK'
export type PromiseTopic =
  | 'completion_date'
  | 'discount'
  | 'installment'
  | 'down_payment'
  | 'price'
  | 'mortgage_rate'
  | 'other'

export interface Segment {
  t: string
  speaker: Speaker
  text: string
}

export interface Call {
  call_id: string
  manager: string
  started_at: string
  duration_sec: number
  language: Language
  segments: Segment[]
}

export interface CriterionAudit {
  id: CriterionId
  name: string
  status: CriterionStatus
  reason: string
  quote: string | null
  quote_en: string | null
}

export interface ViolationAudit {
  topic: string
  quote: string
  quote_en: string | null
  explanation: string
}

export interface WarningAudit {
  topic: string
  quote: string | null
  quote_en: string | null
  explanation: string
}

export interface DroppedClaim {
  text: string
  reason?: string
}

export interface LeadAudit {
  temperature: Temperature
  quote: string | null
  quote_en: string | null
  budget: string | null
  rooms: string | null
  payment: string | null
}

export interface AuditAction {
  code: ActionCode
  title: string
  why: string
}

export interface AuditCardResult {
  call_id: string
  status: 'ok' | 'needs_review'
  review_reason?: string
  run_type: 'saved' | 'live'
  duration_s?: number
  cost?: string
  score_pct: number | null
  criteria: CriterionAudit[]
  violations: ViolationAudit[]
  needs_review: WarningAudit[]
  dropped: DroppedClaim[]
  lead: LeadAudit | null
  summary_en: string | null
  actions: AuditAction[]
}

export interface TestReportRow {
  call_id: string
  scenario: string
  language: Language | null
  expected_actions: ActionCode[]
  agent_actions: ActionCode[]
  baseline_actions: ActionCode[]
  agent_match: boolean
  baseline_match: boolean
}

export interface TestReport {
  agent_accuracy: string
  agent_correct: number
  baseline_accuracy: string
  baseline_correct: number
  total_cases: number
  total_cost: string
  rows: TestReportRow[]
}

export interface DecisionLogEntry {
  id: string
  call_id: string
  action_code: string
  action_title: string
  timestamp: string
  author: 'Head of Sales'
}

export interface ExpectedCase {
  call_id: string
  scenario: string
  accepted: ActionCode[]
  required?: ActionCode[]
}
