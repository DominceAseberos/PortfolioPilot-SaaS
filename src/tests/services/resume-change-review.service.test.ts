import {
  findOriginalResumeSection,
  groupResumeChangeOperations,
  removeReviewedSectionOperations,
  restoreOriginalResumeSection,
} from '@/features/resume/services/resume-change-review.service'
import { ensureOriginalResumeProvenance } from '@/features/resume/services/resume-provenance.service'
import type { DynamicSection } from '@/types/resume'
import type { ResumeChangeOperation } from '@/types/resume-change'

describe('resume initial change review', () => {
  const original = ensureOriginalResumeProvenance([
    {
      title: 'Experience',
      type: 'entries',
      semanticType: 'experience',
      entries: [{ title: 'Staff Nurse', subtitle: 'Example Hospital', dates: '2024 - Present', description: 'Original patient-care description.', bullets: ['Original bullet'] }],
      acceptsAIImprovements: true,
    },
    {
      title: 'Skills',
      type: 'list',
      semanticType: 'skills',
      items: ['Patient Assessment'],
      acceptsAIImprovements: true,
    },
  ] satisfies DynamicSection[])

  const operations: ResumeChangeOperation[] = [
    { action: 'rewrite', sectionTitle: 'Experience', semanticType: 'experience', target: 'entry:Staff Nurse:description', before: 'Original patient-care description.', after: 'Improved patient-care description.', protectedFact: false },
    { action: 'add', sectionTitle: 'Skills', semanticType: 'skills', target: 'list-item', after: 'Leadership', protectedFact: false },
    { action: 'add', sectionTitle: 'Projects', semanticType: 'projects', target: 'section', after: 'Projects', protectedFact: false },
  ]

  it('groups review operations by semantic section', () => {
    const groups = groupResumeChangeOperations(operations)
    expect(groups.map((group) => group.semanticType)).toEqual(['experience', 'skills', 'projects'])
    expect(groups[0].operations).toHaveLength(1)
  })

  it('restores the complete original section and preserves the current manual order', () => {
    const current: DynamicSection[] = [
      {
        ...original[0],
        manualOrder: 7,
        entries: [{
          title: 'Staff Nurse',
          subtitle: 'Example Hospital',
          dates: '2024 - Present',
          description: 'Improved patient-care description.',
          bullets: ['Improved bullet'],
          fieldEvidence: { description: [{ source: 'resume', confidence: 1 }, { source: 'ai', confidence: 0.8 }] },
          bulletEvidence: [{ source: 'resume', confidence: 1 }, { source: 'ai', confidence: 0.8 }],
        }],
      },
      original[1],
    ]

    const restored = restoreOriginalResumeSection(current, original, 'Experience', 'experience')
    const entry = restored[0].type === 'entries' ? restored[0].entries?.[0] : undefined
    expect(entry?.description).toBe('Original patient-care description.')
    expect(entry?.fieldEvidence?.description?.map((item) => item.source)).toEqual(['resume'])
    expect(entry?.bullets).toEqual(['Original bullet'])
    expect(entry?.bulletEvidence?.map((item) => item.source)).toEqual(['resume'])
    expect(restored[0].manualOrder).toBe(7)
  })

  it('removes a section that was added only by AI', () => {
    const current: DynamicSection[] = [
      ...original,
      { title: 'Projects', type: 'entries', semanticType: 'projects', entries: [{ title: 'New Project' }], acceptsAIImprovements: true },
    ]
    const restored = restoreOriginalResumeSection(current, original, 'Projects', 'projects')
    expect(restored.some((section) => section.semanticType === 'projects')).toBe(false)
    expect(findOriginalResumeSection(original, 'Projects', 'projects')).toBeUndefined()
  })

  it('removes reviewed operations only for the restored section', () => {
    const remaining = removeReviewedSectionOperations(operations, 'Experience', 'experience')
    expect(remaining.map((operation) => operation.semanticType)).toEqual(['skills', 'projects'])
  })
})
