import { AIMismatch, GitHubAnalysis, ResumeDetails } from '../../types'
import { DynamicSection, ImprovedResumeData } from '../../types/resume'

export async function buildImprovedResume(
  details: ResumeDetails | null | undefined,
  githubAnalysis: GitHubAnalysis | null | undefined,
  mismatches: AIMismatch[] | null | undefined,
  portfolioUrl?: string,
  githubUsername?: string
): Promise<ImprovedResumeData> {
  const notAligned = mismatches ?? []
  const isGithubIsolated = notAligned.some(
    m => m.type === 'github' && m.severity === 'high' && m.description.includes('Identity Mismatch')
  )

  // 1. Gather existing data to prevent duplicates
  const existingSkillNames = new Set<string>()
  const resumeProjectNames = new Set<string>()

  // Make sure we have an array of dynamic sections to work with
  const originalSections: DynamicSection[] = Array.isArray(details?.sections) 
    ? details.sections.filter((s): s is DynamicSection => 'type' in s) 
    : []

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
  if (rawRepos.length > 0 || originalSections.length > 0) {
    try {
      const response = await fetch('/api/resume/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalSections,
          githubRepos: rawRepos,
          githubUsername
        })
      })
      if (response.ok) {
        const data = await response.json()
        enhancedSections = data.sections || originalSections
      }
    } catch (e) {
      console.error('Failed to generate improved resume sections', e)
    }
  }

  // 4. Return standard ImprovedResumeData format
  return {
    name: details?.name ?? '',
    email: details?.email ?? '',
    phone: '',
    linkedin: details?.linkedin ?? '',
    github: details?.github ?? (githubUsername ? `https://github.com/${githubUsername}` : ''),
    website: portfolioUrl ?? '',
    sections: enhancedSections,
    
    // Legacy fallback bindings (for templates that haven't been updated yet)
    summary: details?.professionalSummary || '',
    skills: existingSkillNames.size > 0 ? Array.from(existingSkillNames) : [],
    workEntries: [],
    projects: [],
    education: [],
    recommendations: []
  }
}
