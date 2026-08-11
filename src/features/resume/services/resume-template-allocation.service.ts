import type { DynamicSection, ImprovedResumeData, ResumeSemanticSectionType } from '@/types/resume'
import { inferSemanticTypeFromTitle } from './canonical-resume.service'

export type ResumeTemplateId = 'classic' | 'modern' | 'compact'

export interface ResumeTemplateAllocation {
  summary: DynamicSection | null
  primary: DynamicSection[]
  secondary: DynamicSection[]
  ordered: DynamicSection[]
}

const CLASSIC_ORDER: ResumeSemanticSectionType[] = [
  'summary',
  'experience',
  'projects',
  'skills',
  'education',
  'certifications',
  'licenses',
  'awards',
  'languages',
  'volunteer',
  'publications',
  'training',
  'custom',
  'unknown',
]

const MODERN_SIDEBAR = new Set<ResumeSemanticSectionType>([
  'skills',
  'education',
  'certifications',
  'licenses',
  'languages',
  'training',
])

const COMPACT_RIGHT = new Set<ResumeSemanticSectionType>([
  'skills',
  'education',
  'certifications',
  'licenses',
  'languages',
  'training',
])

export function getSectionSemanticType(section: DynamicSection): ResumeSemanticSectionType {
  if (section.semanticType && section.semanticType !== 'unknown') return section.semanticType
  return inferSemanticTypeFromTitle(section.title)
}

function stableSortBySemanticPriority(sections: DynamicSection[]): DynamicSection[] {
  return sections
    .map((section, index) => ({ section, index, priority: CLASSIC_ORDER.indexOf(getSectionSemanticType(section)) }))
    .sort((a, b) => {
      const aPriority = a.priority === -1 ? CLASSIC_ORDER.length : a.priority
      const bPriority = b.priority === -1 ? CLASSIC_ORDER.length : b.priority
      return aPriority - bPriority || a.index - b.index
    })
    .map(({ section }) => section)
}

function hasManualOrder(sections: DynamicSection[]): boolean {
  return sections.some((section) => typeof section.manualOrder === 'number')
}

function sortByManualOrder(sections: DynamicSection[]): DynamicSection[] {
  return sections
    .map((section, index) => ({ section, index }))
    .sort((a, b) => (a.section.manualOrder ?? Number.MAX_SAFE_INTEGER) - (b.section.manualOrder ?? Number.MAX_SAFE_INTEGER) || a.index - b.index)
    .map(({ section }) => section)
}

export function reorderResumeSections(sections: DynamicSection[], sourceIndex: number, direction: -1 | 1): DynamicSection[] {
  const sourceSection = sections[sourceIndex]
  if (!sourceSection || getSectionSemanticType(sourceSection) === 'summary') return sections

  const base = hasManualOrder(sections) ? sortByManualOrder(sections) : stableSortBySemanticPriority(sections)
  const currentIndex = base.indexOf(sourceSection)
  if (currentIndex === -1) return sections

  const targetIndex = currentIndex + direction
  if (targetIndex < 0 || targetIndex >= base.length) return sections
  if (getSectionSemanticType(base[targetIndex]) === 'summary') return sections

  const reordered = [...base]
  const [moved] = reordered.splice(currentIndex, 1)
  reordered.splice(targetIndex, 0, moved)
  return reordered.map((section, index) => ({ ...section, manualOrder: index }))
}

export function allocateResumeSections(
  data: Pick<ImprovedResumeData, 'sections'>,
  templateId: ResumeTemplateId
): ResumeTemplateAllocation {
  const sections = data.sections ?? []
  const manuallyOrdered = hasManualOrder(sections)
  const effectiveSections = manuallyOrdered ? sortByManualOrder(sections) : sections
  const summary = effectiveSections.find((section) => getSectionSemanticType(section) === 'summary')
    ?? effectiveSections.find((section) => section.type === 'text')
    ?? null

  if (templateId === 'classic') {
    const ordered = manuallyOrdered ? effectiveSections : stableSortBySemanticPriority(effectiveSections)
    return { summary, primary: ordered, secondary: [], ordered }
  }

  const remaining = effectiveSections.filter((section) => section !== summary)
  const secondaryTypes = templateId === 'modern' ? MODERN_SIDEBAR : COMPACT_RIGHT
  const primary = remaining.filter((section) => !secondaryTypes.has(getSectionSemanticType(section)))
  const secondary = remaining.filter((section) => secondaryTypes.has(getSectionSemanticType(section)))
  const ordered = summary ? [summary, ...primary, ...secondary] : [...primary, ...secondary]

  return { summary, primary, secondary, ordered }
}

export function getPrimaryResumeRole(data: ImprovedResumeData): string {
  const sections = data.sections ?? []
  const experience = sections.find((section) => getSectionSemanticType(section) === 'experience' && section.type === 'entries')
  const project = sections.find((section) => getSectionSemanticType(section) === 'projects' && section.type === 'entries')
  const fallback = sections.find((section) => section.type === 'entries')
  return experience?.entries?.[0]?.title
    || project?.entries?.[0]?.title
    || fallback?.entries?.[0]?.title
    || data.workEntries?.[0]?.role
    || ''
}
