import type { DynamicSection } from '@/types/resume'

export interface GitHubResumeEvidence {
  name?: string
  description?: string | null
  language?: string | null
  topics?: string[]
  readmeSummary?: string | null
  aiResumeDescription?: string | null
}

const normalized = (value?: string | null) => (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const compact = (value?: string | null) => normalized(value).replace(/\s+/g, '')
const repoText = (repo: GitHubResumeEvidence) => normalized([repo.name, repo.description, repo.language, ...(repo.topics ?? []), repo.readmeSummary, repo.aiResumeDescription].filter(Boolean).join(' '))

export function skillHasGitHubEvidence(skill: string, repos: GitHubResumeEvidence[]): boolean {
  const skillText = normalized(skill)
  const skillCompact = compact(skill)
  if (skillText.length < 2) return false
  return repos.some((repo) => {
    const evidence = repoText(repo)
    return evidence.includes(skillText) || (skillCompact.length >= 3 && evidence.replace(/\s+/g, '').includes(skillCompact))
  })
}

export function projectHasGitHubEvidence(title: string, link: string | undefined, repos: GitHubResumeEvidence[]): boolean {
  const project = compact(title)
  const linkText = compact(link)
  return !!project && repos.some((repo) => {
    const repoName = compact(repo.name)
    return !!repoName && (project === repoName || project.includes(repoName) || repoName.includes(project) || linkText.includes(repoName))
  })
}

export function enforceGitHubSkillEvidence(original: DynamicSection | undefined, candidate: DynamicSection | null, repos: GitHubResumeEvidence[]): DynamicSection | null {
  if (!candidate || candidate.type !== 'list') return original ?? null
  if (repos.length === 0) return original ?? null
  const originalItems = original?.type === 'list' ? original.items ?? [] : []
  const safeItems = [...originalItems]
  const keys = new Set(originalItems.map(compact))
  for (const item of candidate.items ?? []) {
    const key = compact(item)
    if (!key || keys.has(key) || !skillHasGitHubEvidence(item, repos)) continue
    safeItems.push(item)
    keys.add(key)
  }
  return { ...candidate, title: original?.title || candidate.title || 'Skills', type: 'list', semanticType: 'skills', classificationConfidence: 1, items: safeItems, acceptsAIImprovements: true }
}

export function enforceGitHubProjectEvidence(original: DynamicSection | undefined, candidate: DynamicSection | null, repos: GitHubResumeEvidence[]): DynamicSection | null {
  if (!candidate || candidate.type !== 'entries') return original ?? null
  if (repos.length === 0) return original ?? null
  const originals = original?.type === 'entries' ? original.entries ?? [] : []
  const originalKeys = new Set(originals.map((entry) => compact(entry.title)))
  const candidates = candidate.entries ?? []
  const safeEntries = originals.map((entry) => {
    const match = candidates.find((candidateEntry) => compact(candidateEntry.title) === compact(entry.title))
    return match ? { ...entry, description: match.description ?? entry.description, link: entry.link ?? match.link, isEnhanced: true } : entry
  })
  for (const entry of candidates) {
    const key = compact(entry.title)
    if (!key || originalKeys.has(key) || !projectHasGitHubEvidence(entry.title, entry.link, repos)) continue
    safeEntries.push({ ...entry, isEnhanced: true })
  }
  return { ...candidate, title: original?.title || candidate.title || 'Projects', type: 'entries', semanticType: 'projects', classificationConfidence: 1, entries: safeEntries, acceptsAIImprovements: true }
}
