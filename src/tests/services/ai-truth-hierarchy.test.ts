import { evaluateTruthHierarchy } from '@/features/ai/services/ai.service'
import type { GitHubAnalysis, PortfolioAnalysis, ResumeAnalysis } from '@/types'

function github(login: string): GitHubAnalysis {
  return {
    score: 80,
    strengths: [],
    weaknesses: [],
    recommendations: [],
    details: {
      profile: {
        login,
        name: login,
        bio: null,
        avatar_url: null,
        blog: null,
        company: null,
        location: null,
        public_repos: 1,
        followers: 0,
        following: 0,
        created_at: '',
      },
      repos: [],
      events: [],
    },
  }
}

function resume(githubUrl: string | null): ResumeAnalysis {
  return {
    score: 80,
    strengths: [],
    weaknesses: [],
    recommendations: [],
    details: {
      name: 'Jane Dev',
      email: 'jane@example.com',
      linkedin: null,
      github: githubUrl,
      skills: [],
      sections: [],
      workEntries: [],
      wordCount: 300,
      hasEmail: true,
      hasLinkedIn: false,
      hasGithub: !!githubUrl,
      hasMetrics: false,
      hasActionVerbs: false,
      rawText: '',
      isAIAnalyzed: false,
    },
  }
}

function portfolio(githubUrl: string): PortfolioAnalysis {
  return {
    score: 80,
    strengths: [],
    weaknesses: [],
    recommendations: [],
    details: {
      url: 'https://janedev.dev',
      checks: [],
      socialLinks: [githubUrl],
    },
  }
}

describe('evaluateTruthHierarchy', () => {
  it('keeps matching resume and selected GitHub sources valid', () => {
    const result = evaluateTruthHierarchy(null, github('jane-dev'), resume('https://github.com/jane-dev'))

    expect(result.validSources.github).toBe(true)
    expect(result.validSources.resume).toBe(true)
    expect(result.mismatches).toEqual([])
  })

  it('isolates selected GitHub when it conflicts with resume GitHub', () => {
    const result = evaluateTruthHierarchy(null, github('wrong-dev'), resume('https://github.com/jane-dev'))

    expect(result.validSources.github).toBe(false)
    expect(result.validSources.resume).toBe(true)
    expect(result.mismatches[0]).toMatchObject({ type: 'github', severity: 'high' })
  })

  it('isolates portfolio when portfolio GitHub conflicts with resume GitHub', () => {
    const result = evaluateTruthHierarchy(
      portfolio('https://github.com/wrong-dev'),
      github('jane-dev'),
      resume('https://github.com/jane-dev')
    )

    expect(result.validSources.portfolio).toBe(false)
    expect(result.validSources.github).toBe(true)
    expect(result.validSources.resume).toBe(true)
  })
})
