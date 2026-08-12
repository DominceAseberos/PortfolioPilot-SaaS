import { aiResumeExtractionSchema, aiResumeScoreSchema } from '@/features/ai/services/ai.schemas'
import { resumeService } from '@/features/resume/services/resume.service'

describe('AI resume schema hardening', () => {
  it('preserves profession-specific vocabulary without a developer skill dictionary', () => {
    const parsed = aiResumeExtractionSchema.parse({
      name: 'Maria Santos',
      email: 'maria@example.com',
      phone: '+63 917 123 4567',
      location: 'Davao City, Philippines',
      sections: [{
        title: 'Clinical Skills',
        type: 'list',
        semanticType: 'skills',
        classificationConfidence: 0.98,
        items: ['Phlebotomy', 'Wound Care', 'IV Therapy'],
        acceptsAIImprovements: false,
      }],
    })
    expect(parsed.phone).toBe('+63 917 123 4567')
    expect(parsed.location).toBe('Davao City, Philippines')
    expect(parsed.sections[0].semanticType).toBe('skills')
    expect(parsed.sections[0].items).toEqual(['Phlebotomy', 'Wound Care', 'IV Therapy'])
  })

  it('preserves structured entry bullets separately from narrative descriptions', () => {
    const parsed = aiResumeExtractionSchema.parse({
      sections: [{
        title: 'Professional Practice',
        type: 'entries',
        semanticType: 'experience',
        classificationConfidence: 0.98,
        entries: [{
          title: 'Staff Nurse',
          subtitle: 'Example Hospital',
          description: 'Acute-care nursing role.',
          bullets: ['Administered medications safely', 'Coordinated multidisciplinary handoffs'],
        }],
      }],
    })

    const section = parsed.sections[0]
    const entry = section.type === 'entries' ? section.entries?.[0] : undefined
    expect(entry?.description).toBe('Acute-care nursing role.')
    expect(entry?.bullets).toEqual(['Administered medications safely', 'Coordinated multidisciplinary handoffs'])
  })

  it('falls back to unknown instead of inventing a semantic category', () => {
    const parsed = aiResumeExtractionSchema.parse({
      sections: [{
        title: 'Community Contributions',
        type: 'entries',
        semanticType: 'made-up-category',
        classificationConfidence: 5,
        entries: [{ title: 'Barangay Program' }],
      }],
    })
    expect(parsed.sections[0].semanticType).toBe('unknown')
    expect(parsed.sections[0].classificationConfidence).toBe(0.5)
  })

  it('normalizes malformed score arrays instead of trusting raw model shape', () => {
    const parsed = aiResumeScoreSchema.parse({
      score: '82',
      strengths: 'Strong communication',
      weaknesses: null,
      recommendations: ['Add measurable outcomes', 123],
    })
    expect(parsed.score).toBe(82)
    expect(parsed.strengths).toEqual(['Strong communication'])
    expect(parsed.weaknesses).toEqual([])
    expect(parsed.recommendations).toEqual(['Add measurable outcomes'])
  })
})

describe('profession-agnostic fallback skills', () => {
  it('extracts nursing skills from the source terminology', () => {
    const text = `
Maria Santos
Registered Nurse

Clinical Skills
• Phlebotomy
• Wound Care
• Patient Assessment
• Medication Administration

Experience
Staff Nurse
Example Hospital
2024 - Present
`
    expect(resumeService.extractGenericSkills(text)).toEqual([
      'Phlebotomy',
      'Wound Care',
      'Patient Assessment',
      'Medication Administration',
    ])
  })

  it('extracts mixed non-technical competencies and deduplicates them', () => {
    const text = `
CORE COMPETENCIES: Classroom Management, Curriculum Mapping, Communication
Communication

EDUCATION
Bachelor of Secondary Education
`
    expect(resumeService.extractGenericSkills(text)).toEqual([
      'Classroom Management',
      'Curriculum Mapping',
      'Communication',
    ])
  })
})
