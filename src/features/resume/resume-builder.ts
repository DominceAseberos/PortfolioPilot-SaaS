import { AIMismatch, GitHubAnalysis, ResumeDetails } from '../../types'
import { DynamicSection, ImprovedResumeData } from '../../types/resume'
import { ensureOriginalResumeProvenance, makeResumeEvidence } from './services/resume-provenance.service'
import type { ResumeChangeOperation } from '../../types/resume-change'

export interface BuildResumeOptions {
  details: ResumeDetails | null | undefined
  githubAnalysis: GitHubAnalysis | null | undefined
  mismatches: AIMismatch[] | null | undefined
  portfolioUrl?: string
  githubUsername?: string
  portfolioMarkdown?: string
  signal?: AbortSignal
}

export async function buildImprovedResume({
  details,
  githubAnalysis,
  mismatches,
  portfolioUrl,
  githubUsername,
  portfolioMarkdown,
  signal,
}: BuildResumeOptions): Promise<ImprovedResumeData> {
  const notAligned = mismatches ?? []
  const isGithubIsolated = notAligned.some(
    m => m.type === 'github' && m.severity === 'high' && m.description.includes('Identity Mismatch')
  )

  // 1. Gather existing data to prevent duplicates
  const existingSkillNames = new Set<string>()
  const resumeProjectNames = new Set<string>()

  // Make sure we have an array of dynamic sections to work with
  const originalSections: DynamicSection[] = ensureOriginalResumeProvenance(
    Array.isArray(details?.sections)
      ? details.sections.filter((s): s is DynamicSection => 'type' in s)
      : []
  )

  originalSections.forEach(section => {
    if (section.type === 'list' && Array.isArray(section.items)) {
      section.items.forEach(item => {
        if (typeof item === 'string') existingSkillNames.add(item.toLowerCase())
      })
    }
    if (section.type === 'entries' && Array.isArray(section.entries)) {
      section.entries.forEach(entry => {
        if (entry && typeof entry.title === 'string') resumeProjectNames.add(entry.title.toLowerCase())
      })
    }
  })

  // 2. Delegate Enhancement to AI Layer 3
  const rawRepos = isGithubIsolated ? [] : (githubAnalysis?.details?.repos ?? [])

  let enhancedSections = originalSections
  let improvementOperations: ResumeChangeOperation[] = []
  let generationWarning: string | undefined
  if (rawRepos.length > 0 || originalSections.length > 0 || portfolioMarkdown) {
    try {
      const response = await fetch('/api/resume/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          originalSections,
          githubRepos: rawRepos,
          githubUsername: isGithubIsolated ? undefined : githubUsername,
          portfolioMarkdown,
          portfolioUrl
        })
      })
      if (!response.ok) {
        let message = `Improvement request failed (${response.status})`
        try {
          const payload = await response.json() as { error?: unknown }
          if (typeof payload.error === 'string' && payload.error.trim()) message = payload.error
        } catch {
          // Preserve the stable status-based message.
        }
        throw new Error(message)
      }

      const payload: unknown = await response.json()
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('Improvement service returned an invalid response')
      }
      const improved = payload as { sections?: unknown; operations?: unknown }
      if (!Array.isArray(improved.sections)) {
        throw new Error('Improvement service returned invalid sections')
      }
      enhancedSections = improved.sections as DynamicSection[]
      improvementOperations = Array.isArray(improved.operations) ? improved.operations as ResumeChangeOperation[] : []
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw e
      const reason = e instanceof Error && /too many requests|rate.?limit/i.test(e.message)
        ? 'AI enhancement is temporarily rate-limited.'
        : 'AI enhancement was unavailable.'
      generationWarning = `${reason} PortfolioPilot loaded your verified original resume content without applying generated changes.`
      console.error('Failed to generate improved resume sections', e)
    }
  }

  // 4. Return standard ImprovedResumeData format
  return {
    name: details?.name || (!isGithubIsolated ? githubAnalysis?.details?.profile?.name : null) || '',
    email: details?.email ?? '',
    phone: details?.phone ?? '',
    location: details?.location ?? (!isGithubIsolated ? githubAnalysis?.details?.profile?.location : null) ?? '',
    linkedin: details?.linkedin ?? '',
    github: details?.github ?? (!isGithubIsolated && githubUsername ? `https://github.com/${githubUsername}` : ''),
    website: portfolioUrl ?? '',
    identityEvidence: {
      name: details?.name
        ? [makeResumeEvidence('resume', 1, 'Uploaded resume')]
        : !isGithubIsolated && githubAnalysis?.details?.profile?.name
          ? [makeResumeEvidence('github', 1, 'GitHub profile', githubUsername ? `https://github.com/${githubUsername}` : undefined)]
          : [],
      email: details?.email ? [makeResumeEvidence('resume', 1, 'Uploaded resume')] : [],
      phone: details?.phone ? [makeResumeEvidence('resume', 1, 'Uploaded resume')] : [],
      location: details?.location
        ? [makeResumeEvidence('resume', 1, 'Uploaded resume')]
        : !isGithubIsolated && githubAnalysis?.details?.profile?.location
          ? [makeResumeEvidence('github', 1, 'GitHub profile location', githubUsername ? `https://github.com/${githubUsername}` : undefined)]
          : [],
      linkedin: details?.linkedin ? [makeResumeEvidence('resume', 1, 'Uploaded resume')] : [],
      github: details?.github
        ? [makeResumeEvidence('resume', 1, 'Uploaded resume')]
        : !isGithubIsolated && githubUsername
          ? [makeResumeEvidence('github', 1, 'GitHub profile', `https://github.com/${githubUsername}`)]
          : [],
      website: portfolioUrl ? [makeResumeEvidence('portfolio', 1, 'Portfolio URL', portfolioUrl)] : [],
    },
    sections: enhancedSections,
    originalSections,
    improvementOperations,
    templateContract: details?.templateContract,
    generationWarning,
    
    // Legacy fallback bindings (for templates that haven't been updated yet)
    summary: details?.professionalSummary || '',
    skills: existingSkillNames.size > 0 ? Array.from(existingSkillNames) : [],
    workEntries: [],
    projects: [],
    education: [],
    recommendations: []
  }
}
