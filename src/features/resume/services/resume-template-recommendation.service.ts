import type { ImprovedResumeData } from '@/types/resume'
import {
  analyzeResumePreflight,
  type ResumePreflightResult,
  type ResumeTemplateId,
} from './resume-layout.service'
import { allocateResumeSections } from './resume-template-allocation.service'

export interface ResumeTemplateRecommendation {
  templateId: ResumeTemplateId
  reason: string
  preflights: Record<ResumeTemplateId, ResumePreflightResult>
}

const TEMPLATE_ORDER: ResumeTemplateId[] = ['classic', 'modern', 'compact']

function rankFit(result: ResumePreflightResult): number {
  if (result.fit === 'comfortable') return 0
  if (result.fit === 'tight') return 1
  return 2
}

function fallbackBest(preflights: Record<ResumeTemplateId, ResumePreflightResult>): ResumeTemplateId {
  return [...TEMPLATE_ORDER].sort((a, b) => {
    const left = preflights[a]
    const right = preflights[b]
    return rankFit(left) - rankFit(right)
      || left.estimatedPages - right.estimatedPages
      || right.score - left.score
      || left.density - right.density
      || TEMPLATE_ORDER.indexOf(a) - TEMPLATE_ORDER.indexOf(b)
  })[0]
}

export function recommendResumeTemplate(data: ImprovedResumeData): ResumeTemplateRecommendation {
  const preflights: Record<ResumeTemplateId, ResumePreflightResult> = {
    classic: analyzeResumePreflight(data, 'classic'),
    modern: analyzeResumePreflight(data, 'modern'),
    compact: analyzeResumePreflight(data, 'compact'),
  }

  const modernAllocation = allocateResumeSections(data, 'modern')
  const modernSidebarSafe = !preflights.modern.warnings.some((warning) => warning.code === 'sidebar-dense')
  const hasUsefulSidebarContent = modernAllocation.secondary.length >= 2

  if (
    preflights.modern.fit === 'comfortable'
    && preflights.modern.density <= 70
    && modernSidebarSafe
    && hasUsefulSidebarContent
  ) {
    return {
      templateId: 'modern',
      reason: 'Your content is light enough for a balanced sidebar layout without crowding.',
      preflights,
    }
  }

  if (preflights.classic.fit === 'comfortable') {
    return {
      templateId: 'classic',
      reason: 'Your content fits comfortably in the most readable single-column layout.',
      preflights,
    }
  }

  if (preflights.compact.fit === 'comfortable') {
    return {
      templateId: 'compact',
      reason: 'Your content is dense, and Compact fits it more safely without shrinking text below readable limits.',
      preflights,
    }
  }

  const templateId = fallbackBest(preflights)
  return {
    templateId,
    reason: `This template has the strongest current fit score and page estimate for your content (${preflights[templateId].fit}, ~${preflights[templateId].estimatedPages} page${preflights[templateId].estimatedPages === 1 ? '' : 's'}).`,
    preflights,
  }
}
