'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { LANGUAGE_LABEL } from '@/lib/data'
import type { AuditCardResult, Call } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge, formatClock, scoreTone } from './ui'

export type CallStatus = 'new' | 'approved' | 'needs_review'
type Filter = 'all' | 'violations' | 'hot'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'violations', label: 'Violations' },
  { id: 'hot', label: 'Hot leads' },
]

export function CallList({
  calls,
  results,
  statuses,
  selectedId,
  onSelect,
}: {
  calls: Call[]
  results: Record<string, AuditCardResult>
  statuses: Map<string, CallStatus>
  selectedId: string
  onSelect: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return calls.filter((call) => {
      const result = results[call.call_id]
      if (filter === 'violations' && !result?.violations?.length) return false
      if (filter === 'hot' && result?.lead?.temperature !== 'hot') return false
      if (!q) return true
      return (
        call.manager.toLowerCase().includes(q) ||
        call.call_id.toLowerCase().includes(q) ||
        (result?.summary_en ?? '').toLowerCase().includes(q)
      )
    })
  }, [calls, results, query, filter])

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <label className="relative block">
          <span className="sr-only">Search calls</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search manager, call ID, summary"
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
          />
        </label>
        <div className="flex gap-1" role="group" aria-label="Filter calls">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'h-7 rounded-md px-2.5 text-xs font-medium transition-colors',
                filter === f.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto" aria-label="Calls">
        {visible.length === 0 && <li className="p-4 text-sm text-muted-foreground">No calls match.</li>}
        {visible.map((call) => {
          const result = results[call.call_id]
          const status = statuses.get(call.call_id) ?? 'new'
          const hasViolation = (result?.violations?.length ?? 0) > 0
          const selected = call.call_id === selectedId
          const score = result?.score_pct ?? null
          return (
            <li key={call.call_id}>
              <button
                type="button"
                onClick={() => onSelect(call.call_id)}
                aria-current={selected ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left transition-colors',
                  selected ? 'bg-blue-50/70 shadow-[inset_2px_0_0_var(--color-primary)]' : 'hover:bg-muted/60',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{call.manager}</span>
                    {hasViolation && (
                      <span className="size-1.5 shrink-0 rounded-full bg-red-600" aria-label="Has violations" role="img" />
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-mono">{formatClock(call.started_at)}</span>
                    <span aria-hidden>·</span>
                    <span className="font-mono">{call.call_id}</span>
                    <Badge tone="outline" className="ml-0.5">{LANGUAGE_LABEL[call.language]}</Badge>
                  </div>
                  {result?.summary_en && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{result.summary_en}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn('font-mono text-sm tabular-nums', scoreTone(score))}>
                    {score === null ? (result ? '—' : '') : `${score}%`}
                  </span>
                  <StatusBadge status={status} />
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function StatusBadge({ status }: { status: CallStatus }) {
  if (status === 'approved') return <Badge tone="blue">Approved</Badge>
  if (status === 'needs_review') return <Badge tone="amber">Needs review</Badge>
  return <Badge>New</Badge>
}
