'use client'

import { useEffect, useMemo, useState } from 'react'
import { getCalls, getReport, getResults } from '@/lib/api'
import type { AuditAction, AuditCardResult, Call, DecisionLogEntry, TestReport } from '@/lib/types'
import { CallDetail } from './call-detail'
import { CallList, type CallStatus } from './call-list'
import { TestSetView } from './test-set-view'
import { cn } from '@/lib/utils'

type Tab = 'calls' | 'test'

export function LeadProofApp() {
  const [tab, setTab] = useState<Tab>('calls')
  const [calls, setCalls] = useState<Call[]>([])
  const [results, setResults] = useState<Record<string, AuditCardResult>>({})
  const [report, setReport] = useState<TestReport | null>(null)
  const [selectedId, setSelectedId] = useState<string>('C-016')
  const [log, setLog] = useState<DecisionLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function loadData() {
      try {
        const [loadedCalls, loadedResults, loadedReport] = await Promise.all([
          getCalls(),
          getResults(),
          getReport(),
        ])
        if (!mounted) return
        setCalls(loadedCalls)
        setResults(loadedResults)
        setReport(loadedReport)

        // Default to C-016 if available, else first call
        if (loadedCalls.some((c) => c.call_id === 'C-016')) {
          setSelectedId('C-016')
        } else if (loadedCalls.length > 0) {
          setSelectedId(loadedCalls[0].call_id)
        }
      } catch (err) {
        console.error('Failed to load initial data:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadData()
    return () => {
      mounted = false
    }
  }, [])

  const handleApprove = (callId: string, action: AuditAction) => {
    const entry: DecisionLogEntry = {
      id: `${callId}-${action.code}-${Date.now()}`,
      call_id: callId,
      action_code: action.code,
      action_title: action.title,
      timestamp: new Date().toISOString(),
      author: 'Head of Sales',
    }
    setLog((prev) => [entry, ...prev])
  }

  const handleLiveResult = (callId: string, liveResult: AuditCardResult) => {
    setResults((prev) => ({
      ...prev,
      [callId]: liveResult,
    }))
  }

  const statuses = useMemo(() => {
    const map = new Map<string, CallStatus>()
    for (const call of calls) {
      const res = results[call.call_id]
      if (!res) {
        map.set(call.call_id, 'new')
        continue
      }
      if (res.status === 'needs_review') {
        map.set(call.call_id, 'needs_review')
      } else if (
        res.actions.length > 0 &&
        res.actions.every((a) => log.some((e) => e.call_id === call.call_id && e.action_code === a.code))
      ) {
        map.set(call.call_id, 'approved')
      } else {
        map.set(call.call_id, 'new')
      }
    }
    return map
  }, [calls, results, log])

  const selectedCall = calls.find((c) => c.call_id === selectedId)
  const selectedResult = selectedId ? results[selectedId] ?? null : null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'calls', label: 'Calls' },
    { id: 'test', label: 'Test Report' },
  ]

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-6 border-b border-border px-4">
        <span className="text-sm font-semibold tracking-tight">LeadProof</span>
        <nav aria-label="Main" className="flex h-full items-stretch gap-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={cn(
                '-mb-px border-b-2 px-0.5 text-sm transition-colors',
                tab === t.id
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading LeadProof workspace…
        </div>
      ) : tab === 'calls' ? (
        <main className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="h-72 shrink-0 border-b border-border md:h-auto md:w-80 md:border-b-0 md:border-r">
            <CallList
              calls={calls}
              results={results}
              statuses={statuses}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </aside>
          <div className="min-w-0 flex-1 overflow-y-auto">
            {selectedCall ? (
              <CallDetail
                key={selectedCall.call_id}
                call={selectedCall}
                result={selectedResult}
                status={statuses.get(selectedCall.call_id) ?? 'new'}
                log={log}
                onApprove={handleApprove}
                onLiveResult={handleLiveResult}
              />
            ) : (
              <p className="p-6 text-sm text-muted-foreground">Select a call to review.</p>
            )}
          </div>
        </main>
      ) : (
        <main className="min-h-0 flex-1 overflow-y-auto">
          <TestSetView report={report} />
        </main>
      )}
    </div>
  )
}
