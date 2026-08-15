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

export interface ResumeTemplateBackgroundRegion {
  color: string
  xRatio: number
  topRatio: number
  widthRatio: number
  heightRatio: number
  textColor?: string
}

export type ResumeTemplateUnsupportedGraphicFeature =
  | 'raster-image'
  | 'gradient-or-shading'
  | 'pattern-or-special-color'
  | 'complex-vector-artwork'

export interface ResumeTemplateGraphicStyleContract {
  bodyTextColor: string
  accentTextColor?: string
  dividerColor?: string
  dividerWidth?: number
  backgroundRegions: ResumeTemplateBackgroundRegion[]
  unsupportedFeatures?: ResumeTemplateUnsupportedGraphicFeature[]
}

export interface ResumeTemplatePageGraphicProfile {
  pageNumber: number
  graphics?: ResumeTemplateGraphicStyleContract
}

export type ResumeTemplateSourceDiagnosticCode =
  | 'mixed-page-sizes'
  | 'mixed-page-rotations'
  | 'rotated-text'
  | 'vertical-text'
  | 'clipping-path'
  | 'partially-scanned'
  | 'image-only'
  | 'text-decoding-anomaly'
  | 'extreme-page-geometry'
  | 'excessive-page-count'

export type ResumeTemplateSourceDiagnosticSeverity = 'info' | 'limited' | 'blocking'

export interface ResumeTemplateSourceDiagnostic {
  code: ResumeTemplateSourceDiagnosticCode
  severity: ResumeTemplateSourceDiagnosticSeverity
  detail: string
  pages?: number[]
  count?: number
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
  graphics?: ResumeTemplateGraphicStyleContract
  pageGraphics?: ResumeTemplatePageGraphicProfile[]
  sourceDiagnostics?: ResumeTemplateSourceDiagnostic[]
}
