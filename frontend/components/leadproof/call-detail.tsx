'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LANGUAGE_LABEL } from '@/lib/data'
import { auditLive } from '@/lib/api'
import type { AuditAction, AuditCardResult, Call, DecisionLogEntry } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AuditResults } from './audit-results'
import { type CallStatus, StatusBadge } from './call-list'
import { LeadSummary } from './lead-summary'
import { RecommendedActions } from './recommended-actions'
import { Transcript } from './transcript'
import { Badge, formatDate, formatDuration, scoreTone, Section } from './ui'

const TEMP_LABEL = { hot: 'Hot', warm: 'Warm', cold: 'Cold' } as const

export function CallDetail({
  call,
  result,
  status,
  log,
  onApprove,
  onLiveResult,
}: {
  call: Call
  result: AuditCardResult | null
  status: CallStatus
  log: DecisionLogEntry[]
  onApprove: (callId: string, action: AuditAction) => void
  onLiveResult: (callId: string, result: AuditCardResult) => void
}) {
  const [activeQuote, setActiveQuote] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeQuote) return
    const el = document.getElementById(`quote-${CSS.escape(activeQuote)}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = window.setTimeout(() => setActiveQuote(null), 2000)
    return () => window.clearTimeout(timer)
  }, [activeQuote])

  const handleRunLive = async () => {
    setRunning(true)
    setLiveError(null)
    try {
      const liveResult = await auditLive(call.call_id)
      onLiveResult(call.call_id, liveResult)
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRunning(false)
    }
  }

  // Collect all highlight quotes from result
  const highlights: { text: string; en: string | null }[] = []
  if (result) {
    for (const c of result.criteria) {
      if (c.quote) highlights.push({ text: c.quote, en: c.quote_en })
    }
    for (const v of result.violations) {
      highlights.push({ text: v.quote, en: v.quote_en })
    }
    for (const w of result.needs_review) {
      if (w.quote) highlights.push({ text: w.quote, en: w.quote_en })
    }
    if (result.lead?.quote) highlights.push({ text: result.lead.quote, en: result.lead.quote_en })
  }

  const info: [string, React.ReactNode][] = [
    ['Manager', call.manager],
    ['Date', `${formatDate(call.started_at)}, ${call.started_at.slice(11, 16)}`],
    ['Duration', formatDuration(call.duration_sec)],
    ['Language', <Badge key="lang" tone="outline">{LANGUAGE_LABEL[call.language]}</Badge>],
    result
      ? [
          'Audit score',
          <span key="score" className={cn('font-mono tabular-nums', scoreTone(result.score_pct))}>
            {result.score_pct === null ? '—' : `${result.score_pct}%`}
          </span>,
        ]
      : ['Audit score', <span key="score" className="text-muted-foreground">—</span>],
    result?.lead
      ? ['Lead', TEMP_LABEL[result.lead.temperature]]
      : ['Lead', 'Not audited'],
  ]

  return (
    <article aria-label={`Call ${call.call_id}`}>
      <Section
        title="Call information"
        aside={
          <div className="flex items-center gap-1.5">
            {result && (
              <Badge tone={result.run_type === 'live' ? 'blue' : 'outline'}>
                {result.run_type === 'live'
                  ? `Live · ${result.duration_s?.toFixed(1)}s · ${result.cost ?? ''}`
                  : 'Saved run'}
              </Badge>
            )}
            <StatusBadge status={status} />
            <Button
              size="sm"
              variant="outline"
              onClick={handleRunLive}
              disabled={running}
              className="ml-1"
            >
              {running && <Loader2 className="animate-spin" aria-hidden />}
              {running ? 'Running…' : 'Run live'}
            </Button>
          </div>
        }
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {info.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {result?.summary_en && <p className="mt-4 text-sm text-muted-foreground">{result.summary_en}</p>}
        {liveError && (
          <p className="mt-2 text-xs text-red-600">Live run failed: {liveError}. Saved result preserved.</p>
        )}
      </Section>

      {result?.status === 'needs_review' && (
        <div className="flex items-start gap-2 border-b border-border bg-amber-50/60 px-6 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <strong>Needs human review</strong>
            {result.review_reason ? ` — ${result.review_reason}` : ''}
          </span>
        </div>
      )}

      <Section
        title="Transcript"
        aside={
          result && highlights.length > 0
            ? <span className="text-[11px] text-muted-foreground">Hover a highlight for the English translation</span>
            : undefined
        }
      >
        <Transcript
          callId={call.call_id}
          segments={call.segments}
          highlights={highlights}
          activeQuote={activeQuote}
        />
      </Section>

      {!result && (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          Not audited yet. Click <strong>Run live</strong> to audit this call.
        </div>
      )}

      {result && result.status === 'ok' && (
        <>
          <Section title="Audit results">
            <AuditResults result={result} onFocusQuote={setActiveQuote} />
          </Section>
          {result.lead && (
            <Section title="Lead information">
              <LeadSummary lead={result.lead} onFocusQuote={setActiveQuote} />
            </Section>
          )}
          <Section title="Recommended actions">
            <RecommendedActions
              callId={call.call_id}
              actions={result.actions}
              log={log}
              onApprove={onApprove}
            />
          </Section>
        </>
      )}
    </article>
  )
}
