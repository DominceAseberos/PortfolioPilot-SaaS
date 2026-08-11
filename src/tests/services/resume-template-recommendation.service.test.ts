import { recommendResumeTemplate } from '@/features/resume/services/resume-template-recommendation.service'
import type { ImprovedResumeData } from '@/types/resume'

function baseData(): ImprovedResumeData {
  return {
    name: 'Candidate',
    email: 'candidate@example.com',
    phone: '',
    linkedin: '',
    github: '',
    website: '',
    sections: [],
  }
}

describe('resume template recommendation', () => {
  it('recommends Modern for light content with useful sidebar sections', () => {
    const data = baseData()
    data.sections = [
      { title: 'Profile', type: 'text', semanticType: 'summary', text: 'Experienced professional focused on reliable service and measurable outcomes.', acceptsAIImprovements: true },
      { title: 'Clinical Competencies', type: 'list', semanticType: 'skills', items: ['Phlebotomy', 'Wound Care', 'Patient Assessment'], acceptsAIImprovements: false },
      { title: 'Education', type: 'entries', semanticType: 'education', entries: [{ title: 'BS Nursing', subtitle: 'Example University', dates: '2020-2024' }], acceptsAIImprovements: false },
      { title: 'Professional Practice', type: 'entries', semanticType: 'experience', entries: [{ title: 'Staff Nurse', subtitle: 'Example Hospital', dates: '2024-Present', description: 'Provided patient-centered care across daily clinical workflows.' }], acceptsAIImprovements: false },
    ]

    expect(recommendResumeTemplate(data).templateId).toBe('modern')
  })

  it('recommends Classic for normal readable content without a meaningful sidebar split', () => {
    const data = baseData()
    data.sections = [
      { title: 'Summary', type: 'text', semanticType: 'summary', text: 'Operations professional with experience improving team processes and customer service.', acceptsAIImprovements: true },
      { title: 'Experience', type: 'entries', semanticType: 'experience', entries: [{ title: 'Operations Coordinator', subtitle: 'Example Company', dates: '2023-Present', description: 'Coordinated daily operations, documentation, scheduling, and cross-team communication.' }], acceptsAIImprovements: false },
    ]

    expect(recommendResumeTemplate(data).templateId).toBe('classic')
  })

  it('recommends Compact when content is too dense for Classic but still fits Compact comfortably', () => {
    const data = baseData()
    data.sections = [
      {
        title: 'Skills',
        type: 'list',
        semanticType: 'skills',
        items: Array.from({ length: 35 }, (_, index) => `Skill ${index + 1}`),
        acceptsAIImprovements: false,
      },
      {
        title: 'Experience',
        type: 'entries',
        semanticType: 'experience',
        entries: Array.from({ length: 4 }, (_, index) => ({
          title: `Role ${index + 1}`,
          subtitle: `Organization ${index + 1}`,
          dates: `202${index}-202${index + 1}`,
          description: 'Managed daily operations and coordinated cross functional activities while maintaining accurate records and consistent service quality.',
        })),
        acceptsAIImprovements: false,
      },
    ]

    const recommendation = recommendResumeTemplate(data)
    expect(recommendation.preflights.classic.fit).toBe('tight')
    expect(recommendation.preflights.compact.fit).toBe('comfortable')
    expect(recommendation.templateId).toBe('compact')
  })
})
