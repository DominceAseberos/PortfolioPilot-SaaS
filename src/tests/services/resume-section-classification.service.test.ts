import {
  needsSectionClassificationReview,
  normalizeManualSectionClassification,
  SECTION_CLASSIFICATION_REVIEW_THRESHOLD,
} from '@/features/resume/services/resume-section-classification.service'
import type { DynamicSection } from '@/types/resume'

describe('resume section classification review', () => {
  const section: DynamicSection = {
    title: 'Clinical Competencies',
    type: 'list',
    semanticType: 'unknown',
    classificationConfidence: 0.42,
    items: ['Phlebotomy', 'Wound Care'],
    acceptsAIImprovements: false,
  }

  it('requires review for unknown classifications', () => {
    expect(needsSectionClassificationReview(section)).toBe(true)
  })

  it('requires review below the confidence threshold', () => {
    expect(needsSectionClassificationReview({
      ...section,
      semanticType: 'skills',
      classificationConfidence: SECTION_CLASSIFICATION_REVIEW_THRESHOLD - 0.01,
    })).toBe(true)
  })

  it('does not require review for sufficiently confident classifications', () => {
    expect(needsSectionClassificationReview({
      ...section,
      semanticType: 'skills',
      classificationConfidence: SECTION_CLASSIFICATION_REVIEW_THRESHOLD,
    })).toBe(false)
  })

  it('manual confirmation changes only classification metadata and preserves source content', () => {
    const confirmed = normalizeManualSectionClassification(section, 'skills')
    expect(confirmed.semanticType).toBe('skills')
    expect(confirmed.classificationConfidence).toBe(1)
    expect(confirmed.title).toBe(section.title)
    expect(confirmed.items).toEqual(section.items)
    expect(confirmed.acceptsAIImprovements).toBe(false)
  })

  it('keeps unknown explicitly reviewable when the user chooses needs review', () => {
    const unresolved = normalizeManualSectionClassification(section, 'unknown')
    expect(unresolved.semanticType).toBe('unknown')
    expect(unresolved.classificationConfidence).toBe(0)
    expect(needsSectionClassificationReview(unresolved)).toBe(true)
  })
})
