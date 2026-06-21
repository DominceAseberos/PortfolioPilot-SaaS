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

  // 2. Extract new enhancements from GitHub (if not isolated)
  const githubLanguages = isGithubIsolated
    ? []
    : Array.from(
        new Set((githubAnalysis?.details?.repos ?? []).filter(r => r.language).map(r => r.language as string))
      ).filter(lang => !existingSkillNames.has(lang.toLowerCase()))

  const newProjects = isGithubIsolated
    ? []
    : (githubAnalysis?.details?.repos ?? [])
        .filter(r => r.stars > 0 && !resumeProjectNames.has(r.name.toLowerCase()))
        .sort((a, b) => b.stars - a.stars)
        .slice(0, 3)
        .map(r => ({
          title: r.name,
          subtitle: 'Open Source Contribution',
          link: githubUsername ? `https://github.com/${githubUsername}/${r.name}` : '',
          description:
            r.aiResumeDescription ||
            r.description ||
            r.readmeSummary ||
            `${r.language ?? 'Open source'} project with ${r.stars} stars`,
          isEnhanced: true,
        }))

  // 3. Delegate Enhancement to AI Layer 3
  let enhancedSections = originalSections
  if (githubLanguages.length > 0 || newProjects.length > 0) {
    try {
      const response = await fetch('/api/resume/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalSections,
          missingSkills: githubLanguages.slice(0, 5),
          missingProjects: newProjects
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
