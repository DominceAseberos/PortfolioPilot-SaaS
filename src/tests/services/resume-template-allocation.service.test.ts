import {
  allocateResumeSections,
  getPrimaryResumeRole,
  getSectionSemanticType,
  reorderResumeSections,
} from '@/features/resume/services/resume-template-allocation.service'
import type { ImprovedResumeData } from '@/types/resume'

const data: ImprovedResumeData = {
  name: 'Alex Rivera',
  email: 'alex@example.com',
  phone: '',
  linkedin: '',
  github: '',
  website: '',
  sections: [
    {
      title: 'Clinical Competencies',
      type: 'list',
      semanticType: 'skills',
      classificationConfidence: 0.96,
      items: ['Phlebotomy', 'Wound Care'],
      acceptsAIImprovements: false,
    },
    {
      title: 'Selected Work',
      type: 'entries',
      semanticType: 'projects',
      classificationConfidence: 0.92,
      entries: [{ title: 'Community Health Initiative' }],
      acceptsAIImprovements: true,
    },
    {
      title: 'Professional Practice',
      type: 'entries',
      semanticType: 'experience',
      classificationConfidence: 0.95,
      entries: [{ title: 'Staff Nurse', subtitle: 'Example Hospital' }],
      acceptsAIImprovements: false,
    },
    {
      title: 'Profile',
      type: 'text',
      semanticType: 'summary',
      classificationConfidence: 0.99,
      text: 'Registered nurse focused on patient care.',
      acceptsAIImprovements: true,
    },
    {
      title: 'Academic Background',
      type: 'entries',
      semanticType: 'education',
      classificationConfidence: 0.98,
      entries: [{ title: 'BS Nursing', subtitle: 'Example University' }],
      acceptsAIImprovements: false,
    },
  ],
}

describe('resume template allocation', () => {
  it('routes semantically classified non-developer sections to the modern sidebar', () => {
    const allocation = allocateResumeSections(data, 'modern')
    expect(allocation.secondary.map((section) => section.title)).toEqual([
      'Clinical Competencies',
      'Academic Background',
    ])
    expect(allocation.primary.map((section) => section.title)).toEqual([
      'Selected Work',
      'Professional Practice',
    ])
  })

  it('routes the same semantic sections to the compact right column', () => {
    const allocation = allocateResumeSections(data, 'compact')
    expect(allocation.secondary.map((section) => section.semanticType)).toEqual(['skills', 'education'])
    expect(allocation.primary.map((section) => section.semanticType)).toEqual(['projects', 'experience'])
  })

  it('orders classic sections by semantic purpose rather than upload order', () => {
    const allocation = allocateResumeSections(data, 'classic')
    expect(allocation.ordered.map((section) => section.semanticType)).toEqual([
      'summary',
      'experience',
      'projects',
      'skills',
      'education',
    ])
  })

  it('uses title inference only as a backward-compatible fallback', () => {
    expect(getSectionSemanticType({
      title: 'Clinical Competencies',
      type: 'list',
      semanticType: 'unknown',
      items: [],
      acceptsAIImprovements: false,
    })).toBe('skills')
  })

  it('prefers the experience role over whichever entry appeared first in source order', () => {
    expect(getPrimaryResumeRole(data)).toBe('Staff Nurse')
  })

  it('starts manual reordering from semantic normalized order and persists it', () => {
    const reordered = reorderResumeSections(data.sections, 1, -1)
    const classic = allocateResumeSections({ sections: reordered }, 'classic')
    expect(classic.ordered.map((section) => section.semanticType)).toEqual([
      'summary',
      'projects',
      'experience',
      'skills',
      'education',
    ])
    expect(classic.ordered.map((section) => section.manualOrder)).toEqual([0, 1, 2, 3, 4])
  })

  it('preserves manual order within template regions', () => {
    const reordered = reorderResumeSections(data.sections, 1, -1)
    const modern = allocateResumeSections({ sections: reordered }, 'modern')
    expect(modern.primary.map((section) => section.semanticType)).toEqual(['projects', 'experience'])
    expect(modern.secondary.map((section) => section.semanticType)).toEqual(['skills', 'education'])
  })

  it('keeps the summary pinned when a move targets it', () => {
    const reordered = reorderResumeSections(data.sections, 3, 1)
    expect(reordered).toBe(data.sections)
  })
})
