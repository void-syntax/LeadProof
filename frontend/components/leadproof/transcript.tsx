'use client'

import { useMemo } from 'react'
import type { Segment } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface HighlightQuote {
  text: string
  en?: string | null
}

interface MarkRange {
  start: number
  end: number
  en?: string | null
}

export function Transcript({
  callId,
  segments,
  highlights,
  quotes,
  activeQuote,
}: {
  callId: string
  segments: Segment[]
  highlights?: HighlightQuote[]
  quotes?: HighlightQuote[]
  activeQuote?: string | null
}) {
  const quoteList = highlights ?? quotes ?? []

  // Normalize quotes for searching
  const validQuotes = useMemo(() => {
    return quoteList
      .filter((q) => q.text && q.text.trim().length >= 3)
      .map((q) => ({
        original: q.text.trim(),
        lower: q.text.trim().toLowerCase(),
        en: q.en,
      }))
  }, [quoteList])

  if (segments.length === 0) {
    return <p className="text-sm text-muted-foreground">Transcript not available.</p>
  }

  return (
    <ol className="flex flex-col gap-3" aria-label="Conversation Transcript">
      {segments.map((segment, index) => {
        const segText = segment.text
        const segLower = segText.toLowerCase()

        // Find non-overlapping occurrences of quotes in this segment
        const marks: MarkRange[] = []
        for (const q of validQuotes) {
          let pos = 0
          while (pos < segLower.length) {
            const found = segLower.indexOf(q.lower, pos)
            if (found === -1) break
            const end = found + q.lower.length
            // Check overlap
            const overlaps = marks.some((m) => Math.max(m.start, found) < Math.min(m.end, end))
            if (!overlaps) {
              marks.push({ start: found, end, en: q.en })
            }
            pos = end
          }
        }

        marks.sort((a, b) => a.start - b.start)

        // Split segment into marked and unmarked parts
        const parts: React.ReactNode[] = []
        let cursor = 0
        marks.forEach((m, mIdx) => {
          if (m.start > cursor) {
            parts.push(segText.slice(cursor, m.start))
          }
          const quoteChunk = segText.slice(m.start, m.end)
          const isActive = activeQuote && quoteChunk.toLowerCase().includes(activeQuote.toLowerCase())

          parts.push(
            <mark
              key={`mark-${index}-${mIdx}`}
              className={cn(
                'group/q relative rounded-sm bg-blue-100/80 px-1 py-0.5 text-foreground transition-all duration-300',
                m.en && 'cursor-help border-b border-dotted border-blue-600',
                isActive && 'bg-amber-200 ring-2 ring-amber-500',
              )}
            >
              {quoteChunk}
              {m.en && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-0 z-30 mb-1 hidden w-max max-w-xs rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md group-hover/q:block group-focus/q:block"
                >
                  <span className="mb-0.5 block font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">
                    English translation
                  </span>
                  {m.en}
                </span>
              )}
            </mark>,
          )
          cursor = m.end
        })

        if (cursor < segText.length) {
          parts.push(segText.slice(cursor))
        }

        const isManager = segment.speaker === 'manager'

        return (
          <li
            key={`seg-${callId}-${index}`}
            className="flex items-start gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/40"
          >
            <span className="w-10 shrink-0 pt-0.5 font-mono text-[11px] text-muted-foreground">{segment.t}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-semibold', isManager ? 'text-primary' : 'text-foreground/80')}>
                  {isManager ? 'Manager' : 'Client'}
                </span>
              </div>
              <p className="mt-0.5 text-sm leading-relaxed">{parts}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
