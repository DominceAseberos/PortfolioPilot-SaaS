import type { ResumeSemanticSectionType } from './resume'

export type ResumeTemplateId = 'classic' | 'modern' | 'compact'
export type ResumeTemplateContractSource = 'builtin' | 'uploaded'
export type ResumeTemplateRegionRole = 'header' | 'full-width' | 'primary' | 'secondary'

export interface ResumeTemplateRegionContract {
  id: string
  role: ResumeTemplateRegionRole
  column: 0 | 1 | 2
  widthRatio: number
  preferredSemanticTypes: ResumeSemanticSectionType[]
  allowedSemanticTypes: ResumeSemanticSectionType[]
  preferredOrder: ResumeSemanticSectionType[]
  overflowTo?: string
}

export interface ResumeTemplateContract {
  id: string
  source: ResumeTemplateContractSource
  templateId?: ResumeTemplateId
  columnCount: 1 | 2
  identityRegionId: string
  summaryRegionId: string
  sectionOrder: ResumeSemanticSectionType[]
  regions: ResumeTemplateRegionContract[]
  allowAdditionalPages: boolean
  preserveHeadingTitles: boolean
  minimumFontSize: number
  confidence: number
  sourcePageCount?: number
}
