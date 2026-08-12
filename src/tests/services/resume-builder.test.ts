import { buildImprovedResume } from '@/features/resume/resume-builder'
import type { ResumeDetails } from '@/types'
import type { DynamicSection } from '@/types/resume'
import type { ResumeChangeOperation } from '@/types/resume-change'

describe('buildImprovedResume review metadata', () => {
  const originalFetch = (globalThis as unknown as { fetch?: typeof fetch }).fetch
  const originalSection: DynamicSection = {
    title: 'Professional Summary',
    type: 'text',
    semanticType: 'summary',
    text: 'Original summary.',
    acceptsAIImprovements: true,
  }

  const details: ResumeDetails = {
    name: 'Jane Example',
    email: 'jane@example.com',
    linkedin: null,
    github: null,
    skills: [],
    sections: [originalSection],
    workEntries: [],
    education: [],
    projects: [],
    professionalSummary: 'Original summary.',
    wordCount: 50,
    hasEmail: true,
    hasLinkedIn: false,
    hasGithub: false,
    hasMetrics: false,
    hasActionVerbs: false,
    rawText: 'Jane Example Original summary.',
    isAIAnalyzed: true,
  }

  afterEach(() => {
    jest.restoreAllMocks()
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: originalFetch,
    })
  })

  const installFetchMock = (implementation: jest.Mock) => {
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      writable: true,
      value: implementation,
    })
  }

  it('preserves original sections and API improvement operations', async () => {
    const operation: ResumeChangeOperation = {
      action: 'rewrite',
      sectionTitle: 'Professional Summary',
      semanticType: 'summary',
      target: 'text',
      before: 'Original summary.',
      after: 'Improved summary.',
      protectedFact: false,
    }

    installFetchMock(jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sections: [{ ...originalSection, text: 'Improved summary.' }],
        operations: [operation],
      }),
    } as Response))

    const result = await buildImprovedResume({
      details,
      githubAnalysis: null,
      mismatches: [],
    })

    expect(result.sections[0].type === 'text' ? result.sections[0].text : '').toBe('Improved summary.')
    expect(result.originalSections?.[0].type === 'text' ? result.originalSections[0].text : '').toBe('Original summary.')
    expect(result.originalSections?.[0].provenance?.text?.map((item) => item.source)).toEqual(['resume'])
    expect(result.improvementOperations).toEqual([operation])
  })

  it('keeps original snapshots even when the improve request fails', async () => {
    installFetchMock(jest.fn().mockRejectedValue(new Error('network unavailable')))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    const result = await buildImprovedResume({
      details,
      githubAnalysis: null,
      mismatches: [],
    })

    expect(result.sections[0].type === 'text' ? result.sections[0].text : '').toBe('Original summary.')
    expect(result.originalSections?.[0].type === 'text' ? result.originalSections[0].text : '').toBe('Original summary.')
    expect(result.improvementOperations).toEqual([])
    expect(consoleSpy).toHaveBeenCalled()
  })
})
