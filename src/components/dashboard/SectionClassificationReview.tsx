'use client'

import { AlertTriangle } from 'lucide-react'
import type { DynamicSection, ResumeSemanticSectionType } from '@/types/resume'
import {
  RESUME_SECTION_TYPE_OPTIONS,
  needsSectionClassificationReview,
} from '@/features/resume/services/resume-section-classification.service'

interface SectionClassificationReviewProps {
  section: DynamicSection
  onChange: (semanticType: ResumeSemanticSectionType) => void
}

export function SectionClassificationReview({ section, onChange }: SectionClassificationReviewProps) {
  if (!needsSectionClassificationReview(section)) return null

  const confidence = typeof section.classificationConfidence === 'number'
    ? Math.round(section.classificationConfidence * 100)
    : null

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">Confirm what this section represents</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            PortfolioPilot is not confident enough to place this section automatically
            {confidence !== null ? ` (${confidence}% confidence)` : ''}. Your content will not be rewritten by this choice.
          </p>
        </div>
      </div>
      <select
        value={section.semanticType || 'unknown'}
        onChange={(event) => onChange(event.target.value as ResumeSemanticSectionType)}
        className="w-full rounded-md border border-border/60 bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label={`Classify ${section.title}`}
      >
        {RESUME_SECTION_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}
