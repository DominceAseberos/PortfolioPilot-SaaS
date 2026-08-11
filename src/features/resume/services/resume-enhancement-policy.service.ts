import type { DynamicSection, ResumeSemanticSectionType } from '@/types/resume'

const PROTECTED_FACT_SECTIONS = new Set<ResumeSemanticSectionType>([
  'experience',
  'education',
  'certifications',
  'licenses',
  'awards',
  'volunteer',
  'publications',
  'training',
])

function normalized(value?: string): string {
  return (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function isSkillSection(section: DynamicSection): boolean {
  if (section.type !== 'list') return false
  if (section.semanticType === 'skills') return true
  return /(skill|competenc|expertise|proficien|tool|abilit|knowledge)/i.test(section.title)
}

export function isProjectSection(section: DynamicSection): boolean {
  if (section.type !== 'entries') return false
  if (section.semanticType === 'projects') return true
  return /(project|portfolio|open source|case stud|work sample)/i.test(section.title)
}

export function isProtectedFactSection(section: DynamicSection): boolean {
  if (section.semanticType && PROTECTED_FACT_SECTIONS.has(section.semanticType)) return true
  return /(experience|employment|education|certif|licen[cs]e|award|volunteer|publication|training)/i.test(section.title)
}

function matchSection(original: DynamicSection[], enhanced: DynamicSection): DynamicSection | undefined {
  if (enhanced.semanticType && enhanced.semanticType !== 'unknown' && enhanced.semanticType !== 'custom') {
    const semanticMatch = original.find((section) => section.semanticType === enhanced.semanticType)
    if (semanticMatch) return semanticMatch
  }
  return original.find((section) => normalized(section.title) === normalized(enhanced.title))
}

export function enforceProtectedResumeFacts(
  originalSections: DynamicSection[],
  enhancedSections: DynamicSection[]
): DynamicSection[] {
  if (originalSections.length === 0) return enhancedSections

  return enhancedSections.map((enhanced) => {
    if (!isProtectedFactSection(enhanced) || enhanced.type !== 'entries') return enhanced

    const original = matchSection(originalSections, enhanced)
    if (!original || original.type !== 'entries') return enhanced

    const originalEntries = original.entries ?? []
    const enhancedEntries = enhanced.entries ?? []

    const safeEntries = originalEntries.map((originalEntry, index) => {
      const titleKey = normalized(originalEntry.title)
      const candidate = enhancedEntries.find((entry) => titleKey && normalized(entry.title) === titleKey) ?? enhancedEntries[index]
      if (!candidate) return originalEntry

      return {
        ...candidate,
        // Protected facts come from the source resume. AI may improve wording, not identity facts.
        title: originalEntry.title,
        subtitle: originalEntry.subtitle ?? candidate.subtitle,
        dates: originalEntry.dates ?? candidate.dates,
        link: originalEntry.link ?? candidate.link,
        description: candidate.description ?? originalEntry.description,
      }
    })

    return {
      ...enhanced,
      title: original.title,
      semanticType: original.semanticType ?? enhanced.semanticType,
      classificationConfidence: original.classificationConfidence ?? enhanced.classificationConfidence,
      entries: safeEntries,
    }
  })
}
