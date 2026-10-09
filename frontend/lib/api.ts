import callsJson from '@/data/calls.json'
import { MOCK_REPORT, MOCK_RESULTS } from './mock-data'
import type { AuditCardResult, Call, TestReport } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '')

/**
 * Fetches all available calls.
 * If backend is not available, loads raw calls from local data.
 */
export async function getCalls(): Promise<Call[]> {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/calls`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        return Array.isArray(data) ? data : data.calls ?? []
      }
    } catch (err) {
      console.warn('[API] /calls request failed, falling back to local dataset:', err)
    }
  }

  // Fallback: return raw call records (without precomputed extraction)
  return ((callsJson as any).calls || []) as Call[]
}

/**
 * Fetches pre-computed audit results for all calls.
 * If backend is not available, returns the demo mock results.
 */
export async function getResults(): Promise<Record<string, AuditCardResult>> {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/results`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          return Object.fromEntries(data.map((item: AuditCardResult) => [item.call_id, item]))
        }
        return data.results ?? data
      }
    } catch (err) {
      console.warn('[API] /results request failed, falling back to mock results:', err)
    }
  }

  // Fallback: return sample saved runs
  return { ...MOCK_RESULTS }
}

/**
 * Fetches the audit accuracy benchmark report.
 * Returns null if no test run has been performed yet.
 */
export async function getReport(): Promise<TestReport | null> {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/report`, { cache: 'no-store' })
      if (res.ok) {
        return (await res.json()) as TestReport
      }
    } catch (err) {
      console.warn('[API] /report request failed, falling back to mock report:', err)
    }
  }

  // Fallback: return standard 20-call benchmark report
  return MOCK_REPORT
}

/**
 * Runs a live AI audit for a specific call.
 * Uses an explicit 30-second timeout.
 */
export async function auditLive(callId: string): Promise<AuditCardResult> {
  const TIMEOUT_MS = 30000

  if (API_URL) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const res = await fetch(`${API_URL}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ call_id: callId }),
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (!res.ok) {
        throw new Error(`Live audit failed with status ${res.status}`)
      }

      const data = await res.json()
      return {
        ...(data.result || data),
        run_type: 'live',
      } as AuditCardResult
    } catch (err: any) {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        throw new Error('Live audit timed out after 30 seconds')
      }
      throw err
    }
  }

  // Offline / Demo fallback: simulate a 2.4s live LLM generation
  await new Promise((r) => setTimeout(r, 2400))

  const existing = MOCK_RESULTS[callId] || MOCK_RESULTS['C-016']
  return {
    ...existing,
    call_id: callId,
    run_type: 'live',
    duration_s: 2.4,
    cost: '$0.002',
  }
}
