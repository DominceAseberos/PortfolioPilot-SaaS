import { enforceGitHubProjectEvidence, enforceGitHubSkillEvidence, projectHasGitHubEvidence, skillHasGitHubEvidence } from '@/features/resume/services/resume-evidence-policy.service'
import type { DynamicSection } from '@/types/resume'

const repos = [{ name: 'portfolio-pilot', description: 'Career review application built with Next.js and Supabase', language: 'TypeScript', topics: ['nextjs', 'supabase'], readmeSummary: 'PortfolioPilot analyzes resumes and developer portfolios.' }]

describe('GitHub evidence policy', () => {
  it('accepts repository-backed skills and rejects unsupported skills', () => {
    expect(skillHasGitHubEvidence('TypeScript', repos)).toBe(true)
    expect(skillHasGitHubEvidence('Supabase', repos)).toBe(true)
    expect(skillHasGitHubEvidence('Kubernetes', repos)).toBe(false)
  })

  it('keeps original skills and drops unsupported AI additions', () => {
    const original: DynamicSection = { title: 'Skills', type: 'list', semanticType: 'skills', items: ['Communication'], acceptsAIImprovements: true }
    const candidate: DynamicSection = { title: 'Skills', type: 'list', semanticType: 'skills', items: ['Communication', 'TypeScript', 'Kubernetes'], acceptsAIImprovements: true }
    expect(enforceGitHubSkillEvidence(original, candidate, repos)?.items).toEqual(['Communication', 'TypeScript'])
  })

  it('requires a new project to match a real repository', () => {
    expect(projectHasGitHubEvidence('Portfolio Pilot', undefined, repos)).toBe(true)
    expect(projectHasGitHubEvidence('Invented Hospital System', undefined, repos)).toBe(false)
  })

  it('drops invented projects while preserving structured bullets for original and evidence-backed projects', () => {
    const original: DynamicSection = { title: 'Projects', type: 'entries', semanticType: 'projects', entries: [{ title: 'Original Project', description: 'Original', bullets: ['Original bullet'] }], acceptsAIImprovements: true }
    const candidate: DynamicSection = { title: 'Projects', type: 'entries', semanticType: 'projects', entries: [{ title: 'Original Project', description: 'Improved wording', bullets: ['Improved bullet'] }, { title: 'Portfolio Pilot', bullets: ['Built with Next.js and Supabase'] }, { title: 'Invented Hospital System', bullets: ['Hallucinated'] }], acceptsAIImprovements: true }
    const entries = enforceGitHubProjectEvidence(original, candidate, repos)?.entries
    expect(entries?.map((entry) => entry.title)).toEqual(['Original Project', 'Portfolio Pilot'])
    expect(entries?.[0].bullets).toEqual(['Improved bullet'])
    expect(entries?.[1].bullets).toEqual(['Built with Next.js and Supabase'])
  })
})
