import type { DynamicSection, ResumeSemanticSectionType } from '@/types/resume'
import type { ResumeChangeOperation } from '@/types/resume-change'

export interface ResumeChangeGroup {
  sectionTitle: string
  semanticType?: ResumeSemanticSectionType
  operations: ResumeChangeOperation[]
}

const normalized = (value?: string) =>
  (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function sameSection(
  section: DynamicSection,
  sectionTitle: string,
  semanticType?: ResumeSemanticSectionType
): boolean {
  if (semanticType && semanticType !== 'unknown' && semanticType !== 'custom') {
    if (section.semanticType === semanticType) return true
  }
  return normalized(section.title) === normalized(sectionTitle)
}

export function groupResumeChangeOperations(operations: ResumeChangeOperation[]): ResumeChangeGroup[] {
  const groups: ResumeChangeGroup[] = []
  for (const operation of operations) {
    let group = groups.find((candidate) =>
      candidate.semanticType && operation.semanticType
        ? candidate.semanticType === operation.semanticType
        : normalized(candidate.sectionTitle) === normalized(operation.sectionTitle)
    )
    if (!group) {
      group = {
        sectionTitle: operation.sectionTitle,
        semanticType: operation.semanticType,
        operations: [],
      }
      groups.push(group)
    }
    group.operations.push(operation)
  }
  return groups
}

export function findOriginalResumeSection(
  originalSections: DynamicSection[],
  sectionTitle: string,
  semanticType?: ResumeSemanticSectionType
): DynamicSection | undefined {
  return originalSections.find((section) => sameSection(section, sectionTitle, semanticType))
}

export function restoreOriginalResumeSection(
  currentSections: DynamicSection[],
  originalSections: DynamicSection[],
  sectionTitle: string,
  semanticType?: ResumeSemanticSectionType
): DynamicSection[] {
  const original = findOriginalResumeSection(originalSections, sectionTitle, semanticType)
  const currentIndex = currentSections.findIndex((section) => sameSection(section, sectionTitle, semanticType))

  if (!original) {
    return currentIndex >= 0
      ? currentSections.filter((_, index) => index !== currentIndex)
      : currentSections
  }

  const restored = {
    ...original,
    manualOrder: currentIndex >= 0 ? currentSections[currentIndex].manualOrder ?? original.manualOrder : original.manualOrder,
    entries: original.type === 'entries'
      ? (original.entries ?? []).map((entry) => ({
          ...entry,
          bullets: entry.bullets ? [...entry.bullets] : undefined,
          fieldEvidence: entry.fieldEvidence
            ? Object.fromEntries(Object.entries(entry.fieldEvidence).map(([key, value]) => [key, value ? [...value] : value]))
            : undefined,
          bulletEvidence: entry.bulletEvidence ? [...entry.bulletEvidence] : undefined,
        }))
      : original.entries,
    items: original.type === 'list' ? [...(original.items ?? [])] : original.items,
    provenance: original.provenance
      ? {
          ...original.provenance,
          section: original.provenance.section ? [...original.provenance.section] : undefined,
          text: original.provenance.text ? [...original.provenance.text] : undefined,
          items: original.provenance.items
            ? Object.fromEntries(Object.entries(original.provenance.items).map(([key, value]) => [key, [...value]]))
            : undefined,
        }
      : undefined,
  }

  if (currentIndex >= 0) {
    return currentSections.map((section, index) => index === currentIndex ? restored : section)
  }

  return [...currentSections, restored]
}

export function removeReviewedSectionOperations(
  operations: ResumeChangeOperation[],
  sectionTitle: string,
  semanticType?: ResumeSemanticSectionType
): ResumeChangeOperation[] {
  return operations.filter((operation) => {
    if (semanticType && operation.semanticType && semanticType === operation.semanticType) return false
    return normalized(operation.sectionTitle) !== normalized(sectionTitle)
  })
}
