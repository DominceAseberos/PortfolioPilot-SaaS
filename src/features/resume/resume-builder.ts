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
}

export async function buildImprovedResume({
  details,
  githubAnalysis,
  mismatches,
  portfolioUrl,
  githubUsername,
  portfolioMarkdown
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
  if (rawRepos.length > 0 || originalSections.length > 0 || portfolioMarkdown) {
    try {
      const response = await fetch('/api/resume/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalSections,
          githubRepos: rawRepos,
          githubUsername,
          portfolioMarkdown,
          portfolioUrl
        })
      })
      if (response.ok) {
        const data = await response.json()
        enhancedSections = data.sections || originalSections
        improvementOperations = Array.isArray(data.operations) ? data.operations : []
      }
    } catch (e) {
      console.error('Failed to generate improved resume sections', e)
    }
  }

  // 4. Return standard ImprovedResumeData format
  return {
    name: details?.name || githubAnalysis?.details?.profile?.name || '',
    email: details?.email ?? '',
    phone: '',
    linkedin: details?.linkedin ?? '',
    github: details?.github ?? (githubUsername ? `https://github.com/${githubUsername}` : ''),
    website: portfolioUrl ?? '',
    identityEvidence: {
      name: details?.name
        ? [makeResumeEvidence('resume', 1, 'Uploaded resume')]
        : githubAnalysis?.details?.profile?.name
          ? [makeResumeEvidence('github', 1, 'GitHub profile', githubUsername ? `https://github.com/${githubUsername}` : undefined)]
          : [],
      email: details?.email ? [makeResumeEvidence('resume', 1, 'Uploaded resume')] : [],
      phone: [],
      linkedin: details?.linkedin ? [makeResumeEvidence('resume', 1, 'Uploaded resume')] : [],
      github: details?.github
        ? [makeResumeEvidence('resume', 1, 'Uploaded resume')]
        : githubUsername
          ? [makeResumeEvidence('github', 1, 'GitHub profile', `https://github.com/${githubUsername}`)]
          : [],
      website: portfolioUrl ? [makeResumeEvidence('portfolio', 1, 'Portfolio URL', portfolioUrl)] : [],
    },
    sections: enhancedSections,
    originalSections,
    improvementOperations,
    
    // Legacy fallback bindings (for templates that haven't been updated yet)
    summary: details?.professionalSummary || '',
    skills: existingSkillNames.size > 0 ? Array.from(existingSkillNames) : [],
    workEntries: [],
    projects: [],
    education: [],
    recommendations: []
  }
}
