'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ACTION_LABEL } from '@/lib/rules'
import type { AuditAction, DecisionLogEntry } from '@/lib/types'
import { Badge } from './ui'

export function RecommendedActions({
  callId,
  actions,
  log,
  onApprove,
}: {
  callId: string
  actions: AuditAction[]
  log: DecisionLogEntry[]
  onApprove: (callId: string, action: AuditAction) => void
}) {
  const entries = log.filter((e) => e.call_id === callId)

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-2">
        {actions.map((action, i) => {
          const approved = entries.some((e) => e.action_code === action.code)
          return (
            <li key={action.code} className="flex gap-3 rounded-md border border-border px-3 py-2.5">
              <span className="pt-0.5 font-mono text-xs text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="outline">{ACTION_LABEL[action.code] ?? action.code}</Badge>
                  {approved && <Badge tone="blue">Approved</Badge>}
                </div>
                <p className="mt-1.5 text-sm font-medium">{action.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{action.why}</p>
              </div>
              <div className="flex shrink-0 items-start gap-1.5">
                <Button
                  size="sm"
                  onClick={() => onApprove(callId, action)}
                  disabled={approved}
                >
                  <Check aria-hidden />
                  {approved ? 'Approved' : 'Approve'}
                </Button>
              </div>
            </li>
          )
        })}
      </ol>

      <p className="text-[11px] text-muted-foreground">
        Approval is recorded in this browser session only. No message is sent and no CRM task is created.
      </p>

      <div>
        <h3 className="mb-2 text-sm font-medium">Audit log</h3>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions recorded for this call yet.</p>
        ) : (
          <ol className="flex flex-col gap-1.5 border-l border-border pl-3">
            {entries.map((e) => (
              <li key={e.id} className="text-xs">
                <span className="font-mono text-muted-foreground">
                  {new Date(e.timestamp).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <span className="text-muted-foreground">{' · '}</span>
                <span className="font-medium">{e.author}</span>
                {' approved '}
                <span className="font-medium">{ACTION_LABEL[e.action_code as keyof typeof ACTION_LABEL] ?? e.action_code}</span>
                {': '}
                <span className="text-muted-foreground">{e.action_title}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
