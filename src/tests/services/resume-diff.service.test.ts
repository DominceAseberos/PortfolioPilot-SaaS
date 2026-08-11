import { diffResumeSections } from '@/features/resume/services/resume-diff.service'
import type { DynamicSection } from '@/types/resume'

describe('resume change operations', () => {
  it('emits wording-only rewrites for protected experience after facts are preserved', () => {
    const original: DynamicSection[] = [{ title: 'Experience', type: 'entries', semanticType: 'experience', acceptsAIImprovements: true, entries: [{ title: 'Staff Nurse', subtitle: 'Hospital', dates: '2024 - Present', description: 'Provided patient care.' }] }]
    const enhanced: DynamicSection[] = [{ title: 'Experience', type: 'entries', semanticType: 'experience', acceptsAIImprovements: true, entries: [{ title: 'Staff Nurse', subtitle: 'Hospital', dates: '2024 - Present', description: 'Delivered safe patient care across assigned clinical workflows.' }] }]
    expect(diffResumeSections(original, enhanced)).toEqual([{ action: 'rewrite', sectionTitle: 'Experience', semanticType: 'experience', target: 'entry:Staff Nurse:description', before: 'Provided patient care.', after: 'Delivered safe patient care across assigned clinical workflows.', protectedFact: false }])
  })

  it('marks factual changes in protected sections as protected operations', () => {
    const original: DynamicSection[] = [{ title: 'Education', type: 'entries', semanticType: 'education', acceptsAIImprovements: false, entries: [{ title: 'BS Nursing', subtitle: 'School A', dates: '2020 - 2024' }] }]
    const enhanced: DynamicSection[] = [{ title: 'Education', type: 'entries', semanticType: 'education', acceptsAIImprovements: false, entries: [{ title: 'BS Nursing', subtitle: 'School B', dates: '2020 - 2024' }] }]
    const operations = diffResumeSections(original, enhanced)
    expect(operations.some((op) => op.target.endsWith(':subtitle') && op.protectedFact)).toBe(true)
  })

  it('records added projects separately from protected employment facts', () => {
    const original: DynamicSection[] = [{ title: 'Projects', type: 'entries', semanticType: 'projects', acceptsAIImprovements: true, entries: [] }]
    const enhanced: DynamicSection[] = [{ title: 'Projects', type: 'entries', semanticType: 'projects', acceptsAIImprovements: true, entries: [{ title: 'PortfolioPilot', description: 'AI-assisted career review platform.' }] }]
    expect(diffResumeSections(original, enhanced)[0]).toMatchObject({ action: 'add', target: 'entry:PortfolioPilot', protectedFact: false })
  })
})
