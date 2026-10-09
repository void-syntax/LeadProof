'use client'

import { AlertTriangle, Check, Info, Minus, ShieldAlert, X } from 'lucide-react'
import type { AuditCardResult, CriterionAudit } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge } from './ui'

const CRITERION_STATUS_MAP: Record<CriterionAudit['status'], { label: string; icon: typeof Check; className: string }> = {
  met: { label: 'Met', icon: Check, className: 'text-emerald-700 bg-emerald-50' },
  not_met: { label: 'Not met', icon: X, className: 'text-red-700 bg-red-50' },
  not_applicable: { label: 'N/A', icon: Minus, className: 'text-muted-foreground bg-muted/60' },
}

export function AuditResults({
  result,
  onFocusQuote,
}: {
  result: AuditCardResult
  onFocusQuote?: (text: string) => void
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Criteria Checklist */}
      <div>
        <h3 className="mb-3 text-sm font-semibold tracking-tight text-foreground">
          Sales Standards Checklist (C1–C6)
        </h3>
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {result.criteria.map((c) => {
            const s = CRITERION_STATUS_MAP[c.status] || CRITERION_STATUS_MAP.not_applicable
            const Icon = s.icon
            return (
              <li key={c.id} className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/20">
                <span className="w-7 shrink-0 font-mono text-xs font-semibold text-muted-foreground">{c.id}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.reason}</p>
                  {c.quote && (
                    <button
                      type="button"
                      onClick={() => onFocusQuote?.(c.quote!)}
                      className="mt-1.5 flex max-w-full items-center gap-1.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
                      title={c.quote_en || c.quote}
                    >
                      <span className="truncate italic">{`“${c.quote}”`}</span>
                    </button>
                  )}
                </div>
                <span className={cn('flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold', s.className)}>
                  <Icon className="size-3.5" aria-hidden />
                  {s.label}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Red Flags: Violations */}
      {result.violations.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-700">
            <ShieldAlert className="size-4 shrink-0" aria-hidden />
            Declaration Red Flags ({result.violations.length})
          </h3>
          <ul className="flex flex-col gap-2.5">
            {result.violations.map((v, i) => (
              <li
                key={`viol-${i}`}
                className="rounded-lg border border-red-200 bg-red-50/50 p-3 text-xs text-red-950"
              >
                <div className="flex items-center gap-2">
                  <Badge tone="red">Violation</Badge>
                  <span className="font-semibold">{v.topic}</span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-red-700">Quote:</span>
                    <button
                      type="button"
                      onClick={() => onFocusQuote?.(v.quote)}
                      className="text-left italic underline-offset-2 hover:underline"
                    >
                      {`“${v.quote}”`}
                    </button>
                  </div>
                  {v.quote_en && (
                    <div className="flex items-start gap-2 text-red-800/80">
                      <span className="font-medium">EN:</span>
                      <span>{v.quote_en}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 pt-1">
                    <span className="font-medium text-red-700">Reason:</span>
                    <span>{v.explanation}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Yellow Notes: Needs Review */}
      {result.needs_review.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            Verification Alerts ({result.needs_review.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {result.needs_review.map((w, i) => (
              <li
                key={`warn-${i}`}
                className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-950"
              >
                <div className="flex items-center gap-2">
                  <Badge tone="amber">Needs verification</Badge>
                  <span className="font-semibold">{w.topic}</span>
                </div>
                {w.quote && (
                  <button
                    type="button"
                    onClick={() => onFocusQuote?.(w.quote!)}
                    className="mt-1.5 block text-left italic underline-offset-2 hover:underline"
                  >
                    {`“${w.quote}”`}
                  </button>
                )}
                <p className="mt-1">{w.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hallucination Guard: Dropped Claims */}
      {result.dropped && result.dropped.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
          <Info className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden />
          <div className="flex-1">
            <span className="font-semibold">
              {`${result.dropped.length} AI claim${result.dropped.length > 1 ? 's' : ''} discarded`}
            </span>
            <span className="ml-1 text-blue-800">
              — our hallucination guard rejected claims where supporting quotes could not be verified in the audio transcript.
            </span>
            <ul className="mt-1.5 list-disc pl-4 space-y-0.5 text-blue-950/80">
              {result.dropped.map((d, idx) => (
                <li key={idx}>
                  <span className="italic">{`“${d.text}”`}</span>
                  {d.reason && <span className="ml-1 text-muted-foreground">({d.reason})</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
