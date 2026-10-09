'use client'

import { useMemo, useState } from 'react'
import { LANGUAGE_LABEL } from '@/lib/data'
import { ACTION_LABEL } from '@/lib/rules'
import type { ActionCode, Language, TestReport, TestReportRow } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Badge } from './ui'

type MatchFilter = 'all' | 'agent_match' | 'agent_miss' | 'base_miss'

function ActionBadges({ codes }: { codes: ActionCode[] }) {
  if (!codes.length) return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex flex-wrap gap-1">
      {codes.map((c, i) => (
        <Badge key={c} tone={i === 0 ? 'neutral' : 'outline'}>
          {ACTION_LABEL[c] ?? c}
        </Badge>
      ))}
    </span>
  )
}

function MatchCell({ value }: { value: boolean }) {
  return value ? <Badge tone="blue">Match</Badge> : <Badge tone="red">Miss</Badge>
}

const selectClass =
  'h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20'

export function TestSetView({ report }: { report: TestReport | null }) {
  const [language, setLanguage] = useState<'all' | Language>('all')
  const [match, setMatch] = useState<MatchFilter>('all')

  const rows = useMemo(() => {
    if (!report) return []
    return report.rows.filter((r: TestReportRow) => {
      if (language !== 'all' && r.language !== language) return false
      if (match === 'agent_match') return r.agent_match === true
      if (match === 'agent_miss') return r.agent_match === false
      if (match === 'base_miss') return r.baseline_match === false
      return true
    })
  }, [report, language, match])

  if (!report) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-center text-sm text-muted-foreground">
        No test run yet. Ask the backend team to run the test set and expose <code className="font-mono">GET /report</code>.
      </div>
    )
  }

  const metrics = [
    {
      label: 'Agent accuracy',
      value: report.agent_accuracy,
      note: `${report.agent_correct} / ${report.total_cases} cases`,
    },
    {
      label: 'Keyword baseline accuracy',
      value: report.baseline_accuracy,
      note: `${report.baseline_correct} / ${report.total_cases} cases`,
    },
    {
      label: 'Total cost',
      value: report.total_cost,
      note: `${report.total_cases} test cases`,
    },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-6">
      <div className="grid grid-cols-1 divide-y divide-border rounded-md border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {metrics.map((m) => (
          <div key={m.label} className="px-4 py-3">
            <div className="text-xs text-muted-foreground">{m.label}</div>
            <div className="mt-1 font-mono text-2xl font-medium tabular-nums">{m.value}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{m.note}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Language
          <select value={language} onChange={(e) => setLanguage(e.target.value as 'all' | Language)} className={selectClass}>
            <option value="all">All</option>
            {(Object.keys(LANGUAGE_LABEL) as Language[]).map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABEL[l]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Match
          <select value={match} onChange={(e) => setMatch(e.target.value as MatchFilter)} className={selectClass}>
            <option value="all">All</option>
            <option value="agent_match">Agent match</option>
            <option value="agent_miss">Agent miss</option>
            <option value="base_miss">Baseline miss</option>
          </select>
        </label>
        <span className="ml-auto text-xs text-muted-foreground">{`${rows.length} of ${report.total_cases} cases`}</span>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Call ID</th>
              <th scope="col" className="px-3 py-2 font-medium">Language</th>
              <th scope="col" className="px-3 py-2 font-medium">Expected</th>
              <th scope="col" className="px-3 py-2 font-medium">Agent</th>
              <th scope="col" className="px-3 py-2 font-medium">Keyword script</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No cases match the filters.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.call_id} className="align-top">
                <td className="px-3 py-2.5">
                  <div className="font-mono text-xs">{r.call_id}</div>
                  <div className="mt-0.5 max-w-56 text-xs text-muted-foreground">{r.scenario}</div>
                </td>
                <td className="px-3 py-2.5">
                  {r.language ? <Badge tone="outline">{LANGUAGE_LABEL[r.language]}</Badge> : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <ActionBadges codes={r.expected_actions} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-1">
                    <ActionBadges codes={r.agent_actions} />
                    <MatchCell value={r.agent_match} />
                  </div>
                </td>
                <td className={cn('px-3 py-2.5')}>
                  <div className="flex flex-col gap-1">
                    <ActionBadges codes={r.baseline_actions} />
                    <MatchCell value={r.baseline_match} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        A prediction matches when its first action is one of the expected actions.
      </p>
    </div>
  )
}
