import {
  analyzeResumePreflight,
  parseDescriptionBlocks,
  RESUME_LAYOUT_PROFILES,
} from '@/features/resume/services/resume-layout.service'
import type { ImprovedResumeData } from '@/types/resume'

describe('resume layout service', () => {
  describe('parseDescriptionBlocks', () => {
    it('preserves paragraphs and extracts common bullet formats', () => {
      const result = parseDescriptionBlocks(
        'Built a customer portal.\n• Improved onboarding flow\n- Reduced duplicate work\n1. Added documentation'
      )

      expect(result).toEqual([
        { type: 'paragraph', text: 'Built a customer portal.' },
        { type: 'bullet', text: 'Improved onboarding flow' },
        { type: 'bullet', text: 'Reduced duplicate work' },
        { type: 'bullet', text: 'Added documentation' },
      ])
    })

    it('returns an empty array for empty input', () => {
      expect(parseDescriptionBlocks(undefined)).toEqual([])
      expect(parseDescriptionBlocks('   ')).toEqual([])
    })
  })

  describe('analyzeResumePreflight', () => {
    const baseData: ImprovedResumeData = {
      name: 'Jane Example',
      email: 'jane@example.com',
      phone: '',
      linkedin: 'https://linkedin.com/in/jane',
      github: '',
      website: 'https://example.com',
      sections: [
        {
          title: 'Professional Summary',
          type: 'text',
          text: 'Operations professional focused on reliable service and continuous improvement.',
          acceptsAIImprovements: true,
        },
        {
          title: 'Experience',
          type: 'entries',
          entries: [
            {
              title: 'Operations Assistant',
              subtitle: 'Example Company',
              dates: '2024–Present',
              description: '• Coordinated daily schedules\n• Maintained accurate records',
            },
          ],
          acceptsAIImprovements: true,
        },
        {
          title: 'Skills',
          type: 'list',
          items: ['Scheduling', 'Records Management', 'Communication'],
          acceptsAIImprovements: true,
        },
      ],
    }

    it('reports a comfortable fit for concise content', () => {
      const result = analyzeResumePreflight(baseData, 'classic')
      expect(result.fit).toBe('comfortable')
      expect(result.estimatedPages).toBe(1)
      expect(result.score).toBeGreaterThan(80)
    })

    it('detects duplicate skills, malformed links, and long content', () => {
      const longBullet = Array.from({ length: 35 }, (_, i) => `word${i}`).join(' ')
      const data: ImprovedResumeData = {
        ...baseData,
        website: 'https://bad url',
        sections: [
          {
            title: 'Professional Summary',
            type: 'text',
            text: Array.from({ length: 90 }, (_, i) => `summary${i}`).join(' '),
            acceptsAIImprovements: true,
          },
          {
            title: 'Experience',
            type: 'entries',
            entries: [
              {
                title: 'Coordinator',
                description: `• ${longBullet}`,
              },
            ],
            acceptsAIImprovements: true,
          },
          {
            title: 'Skills',
            type: 'list',
            items: ['Communication', 'communication'],
            acceptsAIImprovements: true,
          },
        ],
      }

      const result = analyzeResumePreflight(data, 'modern')
      const codes = result.warnings.map((warning) => warning.code)

      expect(codes).toContain('summary-long')
      expect(codes).toContain('bullet-long')
      expect(codes).toContain('duplicate-skill')
      expect(codes).toContain('invalid-link')
    })

    it('uses stricter sidebar capacity for modern than compact', () => {
      expect(RESUME_LAYOUT_PROFILES.modern.sidebarSkillLimit).toBeLessThan(
        RESUME_LAYOUT_PROFILES.compact.sidebarSkillLimit!
      )
    })
  })
})
