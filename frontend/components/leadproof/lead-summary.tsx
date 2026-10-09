import type { LeadAudit } from '@/lib/types'
import { Badge } from './ui'

const TEMP_LABEL = { hot: 'Hot', warm: 'Warm', cold: 'Cold' } as const

export function LeadSummary({
  lead,
  onFocusQuote,
}: {
  lead: LeadAudit
  onFocusQuote?: (text: string) => void
}) {
  const rows: [string, string | null][] = [
    ['Budget', lead.budget],
    ['Rooms', lead.rooms],
    ['Payment', lead.payment],
  ]

  return (
    <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">Temperature</dt>
      <dd className="flex flex-wrap items-center gap-2">
        <Badge tone={lead.temperature === 'hot' ? 'red' : lead.temperature === 'warm' ? 'amber' : 'neutral'}>
          {TEMP_LABEL[lead.temperature]}
        </Badge>
        <span className="text-[11px] text-muted-foreground">AI assessment</span>
        {lead.quote && (
          <button
            type="button"
            onClick={() => onFocusQuote?.(lead.quote!)}
            className="truncate text-xs italic text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            title={lead.quote_en || lead.quote}
          >
            {`“${lead.quote}”`}
          </button>
        )}
      </dd>
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-sm font-medium">{value ?? 'Not specified'}</dd>
        </div>
      ))}
    </dl>
  )
}
