import OpenAI from 'openai'
import { logger } from '@/lib/logger'
import type {
  PortfolioAnalysis,
  GitHubAnalysis,
  ResumeAnalysis,
  AISummaryResult,
  AIMismatch,
} from '@/types'

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'

export interface AIAnalysisResult {
  score: number
  name: string | null
  email: string | null
  linkedin: string | null
  github: string | null
  workEntries: (
    | string
    | { company?: string; role?: string; dates?: string; description?: string }
  )[]
  education: { degree?: string; school?: string; dates?: string }[]
  skills: string[]
  sections: string[]
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  rawText: string
  predictedSeniority?: string
  tone?: string
}

function createClient(): OpenAI | null {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey, baseURL: GROQ_BASE_URL })
}

export async function analyzeResumeWithAI(text: string): Promise<AIAnalysisResult | null> {
  const client = createClient()
  if (!client) return null

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are a resume parser. Analyze the resume text and return JSON only.

Return this exact structure:
{
  "name": "Full name or null",
  "email": "email or null",
  "linkedin": "LinkedIn URL or null",
  "github": "GitHub URL or null",
  "workEntries": [{"company":"...","role":"...","dates":"...","description":"..."}],
  "education": [{"degree":"...","school":"...","dates":"..."}],
  "skills": ["skill1", "skill2"],
  "sections": ["Experience", "Education", "Skills"],
  "score": 0-100,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "recommendations": ["..."],
  "predictedSeniority": "Junior | Mid-Level | Senior | Lead | Executive",
  "tone": "Confident | Passive | Action-Oriented | Vague"
}

Score: 90-100 excellent, 70-89 good, 50-69 average, below 50 needs work.
Use null for missing fields. Empty arrays for missing lists. No markdown.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content)
    return {
      score: parsed.score ?? 50,
      name: parsed.name || null,
      email: parsed.email || null,
      linkedin: parsed.linkedin || null,
      github: parsed.github || null,
      workEntries: Array.isArray(parsed.workEntries) ? parsed.workEntries : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      rawText: text,
      predictedSeniority: parsed.predictedSeniority || undefined,
      tone: parsed.tone || undefined,
    }
  } catch (error) {
    logger.error('AI resume analysis failed', { error: String(error) })
    return null
  }
}

function computeFallbackSummary(
  portfolio?: PortfolioAnalysis,
  github?: GitHubAnalysis,
  resume?: ResumeAnalysis
): AISummaryResult {
  const scores: number[] = []
  if (portfolio) scores.push(portfolio.score)
  if (github) scores.push(github.score)
  if (resume) scores.push(resume.score)
  const fallbackScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  const allStrengths = [
    ...(portfolio?.strengths ?? []),
    ...(github?.strengths ?? []),
    ...(resume?.strengths ?? []),
  ]
  const allWeaknesses = [
    ...(portfolio?.weaknesses ?? []),
    ...(github?.weaknesses ?? []),
    ...(resume?.weaknesses ?? []),
  ]
  const allRecommendations = [
    ...(portfolio?.recommendations ?? []),
    ...(github?.recommendations ?? []),
    ...(resume?.recommendations ?? []),
  ]

  return {
    overallScore: fallbackScore,
    summary: `Portfolio scored ${portfolio?.score ?? 'N/A'}, GitHub scored ${github?.score ?? 'N/A'}, Resume scored ${resume?.score ?? 'N/A'}.`,
    topStrengths: allStrengths.slice(0, 5),
    topWeaknesses: allWeaknesses.slice(0, 5),
    topRecommendations: allRecommendations.slice(0, 5),
    sourceBreakdown: {
      portfolio: portfolio
        ? {
            score: portfolio.score,
            summary: portfolio.strengths.slice(0, 2).join('; ') || 'Analyzed',
          }
        : null,
      github: github
        ? { score: github.score, summary: github.strengths.slice(0, 2).join('; ') || 'Analyzed' }
        : null,
      resume: resume
        ? { score: resume.score, summary: resume.strengths.slice(0, 2).join('; ') || 'Analyzed' }
        : null,
    },
    radar: { presentation: 50, openSource: 50, experience: 50, techStack: 50, consistency: 50 },
  }
}

export async function generateOverallSummary(
  portfolio?: PortfolioAnalysis,
  github?: GitHubAnalysis,
  resume?: ResumeAnalysis
): Promise<AISummaryResult> {
  const client = createClient()
  if (!client) return computeFallbackSummary(portfolio, github, resume)

  try {
    const dataBlock: string[] = []
    if (portfolio) {
      dataBlock.push('<PORTFOLIO>')
      dataBlock.push(`Score: ${portfolio.score}/100`)
      dataBlock.push(
        `Checks passed: ${portfolio.strengths.length} of ${portfolio.strengths.length + portfolio.weaknesses.length}`
      )
      dataBlock.push(`Strengths: ${portfolio.strengths.join('; ')}`)
      dataBlock.push(`Weaknesses: ${portfolio.weaknesses.join('; ')}`)
      dataBlock.push(`URL: ${portfolio.details?.url ?? 'N/A'}`)
      dataBlock.push('</PORTFOLIO>')
    }
    if (github) {
      dataBlock.push('<GITHUB>')
      dataBlock.push(`Score: ${github.score}/100`)
      dataBlock.push(`Username: ${github.details?.profile?.name ?? 'N/A'}`)
      dataBlock.push(`Public repos: ${github.details?.profile?.public_repos ?? 0}`)
      dataBlock.push(`Followers: ${github.details?.profile?.followers ?? 0}`)
      dataBlock.push(`Strengths: ${github.strengths.join('; ')}`)
      dataBlock.push(`Weaknesses: ${github.weaknesses.join('; ')}`)
      dataBlock.push('</GITHUB>')
    }
    if (resume) {
      dataBlock.push('<RESUME>')
      dataBlock.push(`Score: ${resume.score}/100`)
      dataBlock.push(`Name: ${resume.details?.name ?? 'N/A'}`)
      dataBlock.push(`Word count: ${resume.details?.wordCount ?? 'N/A'}`)
      dataBlock.push(`Has email: ${resume.details?.hasEmail ?? false}`)
      dataBlock.push(`Has GitHub: ${resume.details?.hasGithub ?? false}`)
      dataBlock.push(
        `Skills found: ${
          resume.details?.skills
            .filter((s) => s.found)
            .map((s) => s.name)
            .join(', ') || 'N/A'
        }`
      )
      dataBlock.push(`Strengths: ${resume.strengths.join('; ')}`)
      dataBlock.push(`Weaknesses: ${resume.weaknesses.join('; ')}`)
      dataBlock.push('</RESUME>')
    }

    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are a career portfolio analyst. Your task is to evaluate the combined data from a developer's portfolio, GitHub profile, and resume.

RULES (do not violate these):
1. ONLY use the data provided in the tags below. Do NOT invent or assume any information.
2. If a source is missing (no <PORTFOLIO>, <GITHUB>, or <RESUME> tags), say "No data available" for that source.
3. The overallScore MUST be a weighted average of the provided source scores. Default weights: portfolio 35%, github 30%, resume 35%. If a source is missing, redistribute its weight to the remaining sources equally.
4. Do NOT use markdown. Return valid JSON only.
5. Keep summaries concise (1-2 sentences per source).
6. topStrengths, topWeaknesses, topRecommendations: combine from all sources, deduplicate, pick top 5 each, rephrase naturally.

Return this JSON structure:
{
  "overallScore": number,
  "summary": "2-3 sentence overall assessment based only on the data provided",
  "topStrengths": ["strength1", "strength2", ...],
  "topWeaknesses": ["weakness1", "weakness2", ...],
  "topRecommendations": ["rec1", "rec2", ...],
  "sourceBreakdown": {
    "portfolio": { "score": number | null, "summary": "1-2 sentence summary of portfolio findings" },
    "github": { "score": number | null, "summary": "1-2 sentence summary of GitHub findings" },
    "resume": { "score": number | null, "summary": "1-2 sentence summary of resume findings" }
  },
  "radar": {
    "presentation": number (0-100, based on portfolio structure and quality),
    "openSource": number (0-100, based on github repos, stars, followers),
    "experience": number (0-100, based on resume work history),
    "techStack": number (0-100, based on diversity of skills/languages),
    "consistency": number (0-100, based on recent activity and streaks)
  }
}`,
        },
        {
          role: 'user',
          content: `Here is the gathered data for this developer:\n\n${dataBlock.join('\n')}\n\nAnalyze the data and return a JSON summary following the schema above. Do NOT add information that is not in the provided data.`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    })

    const content = response.choices?.[0]?.message?.content
    if (!content) return computeFallbackSummary(portfolio, github, resume)

    const parsed = JSON.parse(content)

    const toStrArr = (v: unknown): string[] => {
      if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string')
      return []
    }

    return {
      overallScore:
        typeof parsed.overallScore === 'number'
          ? parsed.overallScore
          : computeFallbackSummary(portfolio, github, resume).overallScore,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      topStrengths: toStrArr(parsed.topStrengths),
      topWeaknesses: toStrArr(parsed.topWeaknesses),
      topRecommendations: toStrArr(parsed.topRecommendations),
      sourceBreakdown: {
        portfolio: parsed.sourceBreakdown?.portfolio
          ? {
              score: parsed.sourceBreakdown.portfolio.score ?? 0,
              summary: parsed.sourceBreakdown.portfolio.summary ?? '',
            }
          : null,
        github: parsed.sourceBreakdown?.github
          ? {
              score: parsed.sourceBreakdown.github.score ?? 0,
              summary: parsed.sourceBreakdown.github.summary ?? '',
            }
          : null,
        resume: parsed.sourceBreakdown?.resume
          ? {
              score: parsed.sourceBreakdown.resume.score ?? 0,
              summary: parsed.sourceBreakdown.resume.summary ?? '',
            }
          : null,
      },
      radar: {
        presentation: parsed.radar?.presentation ?? 50,
        openSource: parsed.radar?.openSource ?? 50,
        experience: parsed.radar?.experience ?? 50,
        techStack: parsed.radar?.techStack ?? 50,
        consistency: parsed.radar?.consistency ?? 50,
      },
    }
  } catch (error) {
    logger.error('AI overall summary failed', { error: String(error) })
    return computeFallbackSummary(portfolio, github, resume)
  }
}

export function detectMismatches(
  portfolio?: PortfolioAnalysis | null,
  github?: GitHubAnalysis | null,
  resume?: ResumeAnalysis | null
): AIMismatch[] {
  const mismatches: AIMismatch[] = []

  const resumeName = resume?.details?.name?.toLowerCase().trim() || null
  const githubName = github?.details?.profile?.name?.toLowerCase().trim() || null
  const resumeGithub = resume?.details?.github?.toLowerCase() || null
  const resumeLinkedin = resume?.details?.linkedin?.toLowerCase() || null
  const resumeEmail = resume?.details?.email?.toLowerCase() || null
  const githubUsername = github?.details?.profile?.name || null

  if (resumeName && githubName && resumeName !== githubName) {
    mismatches.push({
      type: 'name',
      severity: 'high',
      description: `Name in resume ("${resumeName}") differs from GitHub profile name ("${githubName}")`,
      sources: ['Resume', 'GitHub'],
    })
  }

  const inputGithubUsername = process.env.__GITHUB_INPUT
  if (resumeGithub && inputGithubUsername) {
    const extractedUser = resumeGithub.replace('github.com/', '').trim()
    if (extractedUser !== inputGithubUsername.toLowerCase()) {
      mismatches.push({
        type: 'github',
        severity: 'medium',
        description: `GitHub username in resume ("${extractedUser}") differs from the GitHub username reviewed ("${inputGithubUsername}")`,
        sources: ['Resume', 'GitHub'],
      })
    }
  }

  const portfolioHasGithub = portfolio?.details?.checks?.some(
    (c) => c.name === 'Social Links' && c.status === 'passed'
  )
  const portfolioHasLinkedin = portfolio?.details?.checks?.some(
    (c) => c.name === 'Social Links' && c.status === 'passed'
  )

  if (resumeGithub && !portfolioHasGithub && portfolio) {
    mismatches.push({
      type: 'github',
      severity: 'low',
      description: 'Resume includes a GitHub link but the portfolio does not link to GitHub',
      sources: ['Resume', 'Portfolio'],
    })
  }

  if (resumeLinkedin && !portfolioHasLinkedin && portfolio) {
    mismatches.push({
      type: 'linkedin',
      severity: 'low',
      description: 'Resume includes a LinkedIn link but the portfolio does not link to LinkedIn',
      sources: ['Resume', 'Portfolio'],
    })
  }

  const resumeSkills =
    resume?.details?.skills?.filter((s) => s.found).map((s) => s.name.toLowerCase()) || []
  if (resumeSkills.length > 0 && github) {
    const githubLanguages =
      (github.details?.repos?.map((r) => r.language?.toLowerCase()).filter(Boolean) as string[]) ||
      []
    const uniqueLanguages = [...new Set(githubLanguages)]
    const matchCount = uniqueLanguages.filter((l) =>
      resumeSkills.some((s) => s.includes(l) || l.includes(s))
    ).length
    if (uniqueLanguages.length >= 3 && matchCount === 0) {
      mismatches.push({
        type: 'skill',
        severity: 'medium',
        description: `Resume skills don't match any GitHub repository languages (${uniqueLanguages.slice(0, 5).join(', ')})`,
        sources: ['Resume', 'GitHub'],
      })
    }
  }

  if (portfolio?.details?.isTemplate) {
    mismatches.push({
      type: 'other',
      severity: 'medium',
      description: `Portfolio appears to be an unmodified template or contains placeholder "Lorem Ipsum" text`,
      sources: ['Portfolio'],
    })
  }

  const predictedSeniority = resume?.details?.predictedSeniority?.toLowerCase() || ''
  const resumeRoles = resume?.details?.workEntries?.map(e => typeof e === 'string' ? e : e.role)?.join(' ').toLowerCase() || ''
  
  if (predictedSeniority && (predictedSeniority.includes('junior') || predictedSeniority.includes('mid'))) {
    if (resumeRoles.includes('senior') || resumeRoles.includes('lead') || resumeRoles.includes('head')) {
      mismatches.push({
        type: 'other',
        severity: 'high',
        description: `Title Inflation Detected: Claimed titles (Senior/Lead) do not align with the AI's predicted ${predictedSeniority} seniority based on overall experience depth.`,
        sources: ['Resume'],
      })
    }
  }

  if (resume?.details?.tone && resume.details.tone.toLowerCase().includes('passive')) {
    mismatches.push({
      type: 'other',
      severity: 'low',
      description: `Passive Language: Resume tone is ${resume.details.tone}. Use stronger action-oriented verbs to describe impact.`,
      sources: ['Resume'],
    })
  }

  return mismatches
}
