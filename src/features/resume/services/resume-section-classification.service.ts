import type { DynamicSection, ResumeSemanticSectionType } from '@/types/resume'

export const SECTION_CLASSIFICATION_REVIEW_THRESHOLD = 0.75

export const RESUME_SECTION_TYPE_OPTIONS: { value: ResumeSemanticSectionType; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'skills', label: 'Skills' },
  { value: 'experience', label: 'Experience' },
  { value: 'education', label: 'Education' },
  { value: 'projects', label: 'Projects' },
  { value: 'certifications', label: 'Certifications' },
  { value: 'licenses', label: 'Licenses' },
  { value: 'awards', label: 'Awards' },
  { value: 'languages', label: 'Languages' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'publications', label: 'Publications' },
  { value: 'training', label: 'Training' },
  { value: 'custom', label: 'Other / Custom' },
  { value: 'unknown', label: 'Needs Review' },
]

export function needsSectionClassificationReview(section: Pick<DynamicSection, 'semanticType' | 'classificationConfidence'>): boolean {
  if (!section.semanticType || section.semanticType === 'unknown') return true
  if (typeof section.classificationConfidence !== 'number') return false
  return section.classificationConfidence < SECTION_CLASSIFICATION_REVIEW_THRESHOLD
}

export function normalizeManualSectionClassification(
  section: DynamicSection,
  semanticType: ResumeSemanticSectionType
): DynamicSection {
  return {
    ...section,
    semanticType,
    classificationConfidence: semanticType === 'unknown' ? 0 : 1,
  }
}
