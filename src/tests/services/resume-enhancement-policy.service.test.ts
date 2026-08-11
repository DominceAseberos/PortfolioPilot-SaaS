import {
  enforceProtectedResumeFacts,
  isProjectSection,
  isSkillSection,
} from '@/features/resume/services/resume-enhancement-policy.service'
import type { DynamicSection } from '@/types/resume'

describe('resume enhancement policy', () => {
  it('never treats Experience as a project target just because it allows AI improvements', () => {
    const experience: DynamicSection = {
      title: 'Experience',
      type: 'entries',
      semanticType: 'experience',
      entries: [],
      acceptsAIImprovements: true,
    }
    expect(isProjectSection(experience)).toBe(false)
  })

  it('recognizes profession-specific skill sections', () => {
    const clinicalSkills: DynamicSection = {
      title: 'Clinical Skills',
      type: 'list',
      semanticType: 'skills',
      items: ['Phlebotomy'],
      acceptsAIImprovements: false,
    }
    expect(isSkillSection(clinicalSkills)).toBe(true)
  })

  it('restores protected job facts while allowing wording improvements', () => {
    const original: DynamicSection[] = [{
      title: 'Experience',
      type: 'entries',
      semanticType: 'experience',
      acceptsAIImprovements: true,
      entries: [{
        title: 'Staff Nurse',
        subtitle: 'Example Hospital',
        dates: '2024 - Present',
        description: 'Provided patient care.',
      }],
    }]

    const enhanced: DynamicSection[] = [{
      title: 'Experience',
      type: 'entries',
      semanticType: 'experience',
      acceptsAIImprovements: true,
      entries: [
        {
          title: 'Senior Medical Director',
          subtitle: 'Different Hospital',
          dates: '2020 - Present',
          description: 'Delivered safe patient care and coordinated clinical workflows.',
        },
        {
          title: 'Invented Job',
          subtitle: 'Fake Employer',
          dates: '2019',
          description: 'Should not survive.',
        },
      ],
    }]

    const result = enforceProtectedResumeFacts(original, enhanced)
    expect(result[0].entries).toHaveLength(1)
    expect(result[0].entries?.[0].title).toBe('Staff Nurse')
    expect(result[0].entries?.[0].subtitle).toBe('Example Hospital')
    expect(result[0].entries?.[0].dates).toBe('2024 - Present')
    expect(result[0].entries?.[0].description).toContain('coordinated clinical workflows')
  })

  it('allows new evidence-backed project entries to remain in Projects', () => {
    const original: DynamicSection[] = [{
      title: 'Projects', type: 'entries', semanticType: 'projects', acceptsAIImprovements: true,
      entries: [{ title: 'Original Project', description: 'Original description' }],
    }]
    const enhanced: DynamicSection[] = [{
      title: 'Projects', type: 'entries', semanticType: 'projects', acceptsAIImprovements: true,
      entries: [
        { title: 'Original Project', description: 'Improved description' },
        { title: 'GitHub Project', description: 'Evidence-backed new project' },
      ],
    }]
    const result = enforceProtectedResumeFacts(original, enhanced)
    expect(result[0].entries).toHaveLength(2)
    expect(result[0].entries?.[1].title).toBe('GitHub Project')
  })
})
