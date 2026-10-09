import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'red' | 'amber' | 'blue' | 'outline'

const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-foreground/80',
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-800',
  blue: 'bg-blue-50 text-blue-700',
  outline: 'border border-border text-muted-foreground',
}

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-none', TONES[tone], className)}>
      {children}
    </span>
  )
}

export function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b border-border px-6 py-5 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function scoreTone(score: number | null) {
  if (score === null) return 'text-muted-foreground'
  if (score < 60) return 'text-red-600'
  return 'text-foreground'
}

export function formatClock(iso: string) {
  return iso.slice(11, 16)
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[m - 1]} ${d}, ${y}`
}

export function formatDuration(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}
