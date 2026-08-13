import type { DynamicSection, ImprovedResumeData, ResumeSemanticSectionType } from '@/types/resume'
import type { ResumeTemplateContract, ResumeTemplateId } from '@/types/resume-template-contract'
import { inferSemanticTypeFromTitle } from './canonical-resume.service'
import {
  DEFAULT_SECTION_ORDER,
  getBuiltInResumeTemplateContract,
  getTemplateRegionForSemanticType,
} from './resume-template-contract.service'

export type { ResumeTemplateId } from '@/types/resume-template-contract'

export interface ResumeTemplateAllocation {
  summary: DynamicSection | null
  primary: DynamicSection[]
  secondary: DynamicSection[]
  ordered: DynamicSection[]
}

export function getSectionSemanticType(section: DynamicSection): ResumeSemanticSectionType {
  if (section.semanticType && section.semanticType !== 'unknown') return section.semanticType
  return inferSemanticTypeFromTitle(section.title)
}

function stableSortBySemanticPriority(
  sections: DynamicSection[],
  order: ResumeSemanticSectionType[] = DEFAULT_SECTION_ORDER
): DynamicSection[] {
  return sections
    .map((section, index) => ({ section, index, priority: order.indexOf(getSectionSemanticType(section)) }))
    .sort((a, b) => {
      const aPriority = a.priority === -1 ? order.length : a.priority
      const bPriority = b.priority === -1 ? order.length : b.priority
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

function allocateWithContract(
  data: Pick<ImprovedResumeData, 'sections'>,
  contract: ResumeTemplateContract
): ResumeTemplateAllocation {
  const sections = data.sections ?? []
  const manuallyOrdered = hasManualOrder(sections)
  const baseSections = manuallyOrdered ? sortByManualOrder(sections) : sections
  const summary = baseSections.find((section) => getSectionSemanticType(section) === 'summary')
    ?? baseSections.find((section) => section.type === 'text')
    ?? null

  if (contract.columnCount === 1) {
    const effectiveSections = manuallyOrdered
      ? baseSections
      : stableSortBySemanticPriority(baseSections, contract.sectionOrder)
    const orderedSummary = effectiveSections.find((section) => section === summary) ?? summary
    const remaining = effectiveSections.filter((section) => section !== orderedSummary)
    const ordered = orderedSummary ? [orderedSummary, ...remaining] : remaining
    return { summary: orderedSummary, primary: ordered, secondary: [], ordered }
  }

  const remaining = baseSections.filter((section) => section !== summary)

  const primary = remaining.filter((section) => {
    const region = getTemplateRegionForSemanticType(contract, getSectionSemanticType(section))
    return region.role === 'primary' || region.role === 'full-width'
  })
  const secondary = remaining.filter((section) => {
    const region = getTemplateRegionForSemanticType(contract, getSectionSemanticType(section))
    return region.role === 'secondary'
  })
  const ordered = summary ? [summary, ...primary, ...secondary] : [...primary, ...secondary]

  return { summary, primary, secondary, ordered }
}

export function allocateResumeSections(
  data: Pick<ImprovedResumeData, 'sections'>,
  templateId: ResumeTemplateId
): ResumeTemplateAllocation {
  return allocateWithContract(data, getBuiltInResumeTemplateContract(templateId))
}

export function allocateResumeSectionsForContract(
  data: Pick<ImprovedResumeData, 'sections'>,
  contract: ResumeTemplateContract
): ResumeTemplateAllocation {
  return allocateWithContract(data, contract)
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
