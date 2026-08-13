import type { ResumeSemanticSectionType } from './resume'

export type ResumeTemplateId = 'classic' | 'modern' | 'compact'
export type ResumeTemplateContractSource = 'builtin' | 'uploaded'
export type ResumeTemplateRegionRole = 'header' | 'full-width' | 'primary' | 'secondary'
export type ResumeTemplateFontClass = 'sans' | 'serif' | 'mono'
export type ResumeTemplateHeaderAlignment = 'left' | 'center'

export interface ResumeTemplateStyleContract {
  pageWidth: number
  pageHeight: number
  margins: { top: number; right: number; bottom: number; left: number }
  sourceFontFamily: string
  fontClass: ResumeTemplateFontClass
  bodyFontSize: number
  headingFontSize: number
  nameFontSize: number
  lineHeight: number
  sectionGap: number
  headerAlignment: ResumeTemplateHeaderAlignment
}

export interface ResumeTemplateRegionContract {
  id: string
  role: ResumeTemplateRegionRole
  column: 0 | 1 | 2
  widthRatio: number
  preferredSemanticTypes: ResumeSemanticSectionType[]
  allowedSemanticTypes: ResumeSemanticSectionType[]
  preferredOrder: ResumeSemanticSectionType[]
  capacityLines?: number
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
  style?: ResumeTemplateStyleContract
}
