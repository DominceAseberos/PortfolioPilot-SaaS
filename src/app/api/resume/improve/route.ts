import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateImprovedResumeContent } from '@/features/ai/services/ai.service'
import { diffResumeSections } from '@/features/resume/services/resume-diff.service'
import { decorateEnhancedResumeProvenance } from '@/features/resume/services/resume-provenance.service'

const MAX_JSON_BYTES = 1_000_000
const MAX_SECTIONS = 60
const MAX_GITHUB_REPOS = 100
const MAX_PORTFOLIO_MARKDOWN_CHARS = 250_000

function declaredBodyTooLarge(req: Request, limit: number): boolean {
  const raw = req.headers.get('content-length')
  if (!raw) return false
  const length = Number(raw)
  return Number.isFinite(length) && length > limit
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (declaredBodyTooLarge(req, MAX_JSON_BYTES)) {
      return NextResponse.json({ error: 'Resume input is too large to improve safely' }, { status: 413 })
    }

    const rawBody = await req.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_JSON_BYTES) {
      return NextResponse.json({ error: 'Resume input is too large to improve safely' }, { status: 413 })
    }

    let body: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(rawBody)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid')
      body = parsed as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const { originalSections, githubRepos, githubUsername, portfolioMarkdown, portfolioUrl } = body

    if (!Array.isArray(originalSections) || originalSections.length === 0) {
      return NextResponse.json({ error: 'Missing originalSections' }, { status: 400 })
    }
    if (originalSections.length > MAX_SECTIONS) {
      return NextResponse.json({ error: 'Resume contains too many sections to improve safely' }, { status: 413 })
    }
    if (githubRepos !== undefined && (!Array.isArray(githubRepos) || githubRepos.length > MAX_GITHUB_REPOS)) {
      return NextResponse.json({ error: 'GitHub repository input is too large' }, { status: 413 })
    }
    if (
      portfolioMarkdown !== undefined
      && (typeof portfolioMarkdown !== 'string' || portfolioMarkdown.length > MAX_PORTFOLIO_MARKDOWN_CHARS)
    ) {
      return NextResponse.json({ error: 'Portfolio content is too large to improve safely' }, { status: 413 })
    }

    const safeGithubRepos = Array.isArray(githubRepos) ? githubRepos : []
    const safeGithubUsername = typeof githubUsername === 'string' ? githubUsername : undefined
    const safePortfolioMarkdown = typeof portfolioMarkdown === 'string' ? portfolioMarkdown : undefined
    const safePortfolioUrl = typeof portfolioUrl === 'string' ? portfolioUrl : undefined

    const enhancedSections = await generateImprovedResumeContent(
      originalSections,
      safeGithubRepos,
      safeGithubUsername,
      safePortfolioMarkdown
    )

    const sectionsWithProvenance = decorateEnhancedResumeProvenance(originalSections, enhancedSections, {
      githubRepos: safeGithubRepos,
      githubUsername: safeGithubUsername,
      portfolioMarkdown: safePortfolioMarkdown,
      portfolioUrl: safePortfolioUrl,
    })
    const operations = diffResumeSections(originalSections, sectionsWithProvenance)
    return NextResponse.json({ sections: sectionsWithProvenance, operations })
  } catch (error) {
    console.error('Error in /api/resume/improve:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
