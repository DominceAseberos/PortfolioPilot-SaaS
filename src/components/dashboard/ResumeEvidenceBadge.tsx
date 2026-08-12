import React from 'react'
import { Badge } from '@/components/common/Badge'
import type { EvidenceRef, ResumeSource } from '@/types/resume-provenance'

const LABELS: Record<ResumeSource, string> = {
  resume: 'Resume',
  github: 'GitHub',
  portfolio: 'Portfolio',
  ai: 'AI wording',
  user: 'You',
}

const CLASSES: Record<ResumeSource, string> = {
  resume: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  github: 'border-violet-500/25 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  portfolio: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  ai: 'border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400',
  user: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

export function ResumeEvidenceBadge({ evidence, compact = false }: { evidence?: EvidenceRef[]; compact?: boolean }) {
  if (!evidence?.length) return null

  const bySource = new Map<ResumeSource, EvidenceRef[]>()
  for (const item of evidence) {
    const values = bySource.get(item.source) ?? []
    values.push(item)
    bySource.set(item.source, values)
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {[...bySource.entries()].map(([source, refs]) => {
        const detail = refs
          .map((ref) => [ref.evidence, ref.sourceUrl].filter(Boolean).join(' · '))
          .filter(Boolean)
          .join('\n')
        return (
          <Badge
            key={source}
            variant="outline"
            title={detail || LABELS[source]}
            className={`${CLASSES[source]} ${compact ? 'px-1.5 py-0 text-[9px]' : 'text-[10px]'}`}
          >
            {LABELS[source]}
          </Badge>
        )
      })}
    </span>
  )
}
