import { buildImprovedResume } from '@/features/resume/resume-builder'
import type { ResumeDetails } from '@/types'
import type { DynamicSection } from '@/types/resume'
import type { ResumeChangeOperation } from '@/types/resume-change'
import type { ResumeTemplateContract } from '@/types/resume-template-contract'

describe('buildImprovedResume review metadata', () => {
  const originalFetch = (globalThis as unknown as { fetch?: typeof fetch }).fetch
  const originalSection: DynamicSection = {
    title: 'Professional Summary',
    type: 'text',
    semanticType: 'summary',
    text: 'Original summary.',
    acceptsAIImprovements: true,
  }

  const templateContract: ResumeTemplateContract = {
    id: 'uploaded-test-v1',
    source: 'uploaded',
    columnCount: 1,
    identityRegionId: 'header',
    summaryRegionId: 'main',
    sectionOrder: ['summary', 'experience', 'skills', 'education', 'custom', 'unknown'],
    regions: [
      { id: 'header', role: 'header', column: 0, widthRatio: 1, preferredSemanticTypes: [], allowedSemanticTypes: [], preferredOrder: [] },
      { id: 'main', role: 'primary', column: 0, widthRatio: 1, preferredSemanticTypes: ['summary', 'experience', 'skills', 'education', 'custom', 'unknown'], allowedSemanticTypes: ['summary', 'experience', 'skills', 'education', 'custom', 'unknown'], preferredOrder: ['summary', 'experience', 'skills', 'education', 'custom', 'unknown'], capacityLines: 48 },
    ],
    allowAdditionalPages: true,
    preserveHeadingTitles: true,
    minimumFontSize: 9,
    confidence: 0.9,
    sourcePageCount: 1,
  }

  const details: ResumeDetails = {
    name: 'Jane Example',
    email: 'jane@example.com',
    phone: '+63 917 123 4567',
    location: 'Davao City, Philippines',
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
    templateContract,
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
    expect(result.phone).toBe('+63 917 123 4567')
    expect(result.location).toBe('Davao City, Philippines')
    expect(result.identityEvidence?.phone?.map((item) => item.source)).toEqual(['resume'])
    expect(result.identityEvidence?.location?.map((item) => item.source)).toEqual(['resume'])
    expect(result.improvementOperations).toEqual([operation])
    expect(result.templateContract).toBe(templateContract)
  })

  it('uses GitHub location only when the resume has no location', async () => {
    installFetchMock(jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sections: [originalSection], operations: [] }),
    } as Response))

    const result = await buildImprovedResume({
      details: { ...details, location: null },
      githubAnalysis: {
        score: 0,
        strengths: [],
        weaknesses: [],
        recommendations: [],
        details: {
          profile: {
            login: 'jane',
            name: 'Jane Example',
            bio: null,
            avatar_url: null,
            blog: null,
            company: null,
            location: 'Cebu City, Philippines',
            public_repos: 0,
            followers: 0,
            following: 0,
            created_at: '2024-01-01T00:00:00Z',
          },
          repos: [],
          events: [],
        },
      },
      githubUsername: 'jane',
      mismatches: [],
    })

    expect(result.location).toBe('Cebu City, Philippines')
    expect(result.identityEvidence?.location?.map((item) => item.source)).toEqual(['github'])
  })

  it('does not use identity fallbacks from an isolated GitHub profile', async () => {
    installFetchMock(jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sections: [originalSection], operations: [] }),
    } as Response))

    const result = await buildImprovedResume({
      details: { ...details, location: null, github: null },
      githubAnalysis: {
        score: 0,
        strengths: [],
        weaknesses: [],
        recommendations: [],
        details: {
          profile: {
            login: 'wrong-user',
            name: 'Wrong User',
            bio: null,
            avatar_url: null,
            blog: null,
            company: null,
            location: 'Wrong City',
            public_repos: 0,
            followers: 0,
            following: 0,
            created_at: '2024-01-01T00:00:00Z',
          },
          repos: [],
          events: [],
        },
      },
      githubUsername: 'wrong-user',
      mismatches: [{
        type: 'github',
        severity: 'high',
        description: 'Identity Mismatch: wrong GitHub profile',
        sources: ['Resume', 'GitHub'],
      }],
    })

    expect(result.location).toBe('')
    expect(result.github).toBe('')
    expect(result.identityEvidence?.location).toEqual([])
    expect(result.identityEvidence?.github).toEqual([])
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
    expect(result.generationWarning).toMatch(/verified original resume content/i)
    expect(consoleSpy).toHaveBeenCalled()
  })

  it('propagates aborted improve requests instead of silently falling back', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const fetchMock = jest.fn().mockRejectedValue(abortError)
    installFetchMock(fetchMock)
    const controller = new AbortController()

    await expect(buildImprovedResume({
      details,
      githubAnalysis: null,
      mismatches: [],
      signal: controller.signal,
    })).rejects.toMatchObject({ name: 'AbortError' })

    expect(fetchMock).toHaveBeenCalledWith('/api/resume/improve', expect.objectContaining({
      signal: controller.signal,
    }))
  })

})
