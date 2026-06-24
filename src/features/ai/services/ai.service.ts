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

import { DynamicSection } from '../../../types/resume'

export interface AIAnalysisResult {
  score: number
  name: string | null
  email: string | null
  linkedin: string | null
  github: string | null
  sections: DynamicSection[]
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

export async function analyzeResumeWithAI(text: string, scrapedContext?: string): Promise<AIAnalysisResult | null> {
  const client = createClient()
  if (!client) return null

  try {
    // LAYER 1: STRICT EXTRACTION & STANDARDIZATION
    const extractResponse = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a strict data extraction parser. Your ONLY job is to take raw resume text and cleanly restructure it into standard JSON.
Do NOT score the resume. Do NOT generate strengths or weaknesses.

CRITICAL RULES:
1. Split any comma-separated skills (e.g., "Python, Java, C++") into individual items in an array: ["Python", "Java", "C++"].
2. Standardize all dates.
3. You MUST use 'list' type for Skills sections, and 'entries' type for Experience/Projects/Education sections.

Return this EXACT structure ONLY:
{
  "name": "Full name or null",
  "email": "email or null",
  "linkedin": "LinkedIn URL or null",
  "github": "GitHub URL or null",
  "sections": [
    {
      "title": "Exact Header from PDF (e.g. SKILLS, EXPERIENCE, PROJECTS)",
      "type": "text | list | entries", 
      "text": "Extracted paragraph for text sections",
      "items": ["item1", "item2"], 
      "entries": [{"title": "Role/Project", "subtitle": "Company", "dates": "...", "description": "..."}],
      "acceptsAIImprovements": true // True ONLY for sections containing skills, technical proficiencies, projects, or open source work!
    }
  ],
  "predictedSeniority": "Junior | Mid-Level | Senior | Lead | Executive",
  "tone": "Confident | Passive | Action-Oriented | Vague"
}

If the resume lacks any technical skills or projects section, create empty placeholder sections for them (e.g. "Skills" with type "list" and "Projects" with type "entries") and set acceptsAIImprovements: true. Use null for missing fields.`,
        },
        {
          role: 'user',
          content: scrapedContext ? `${text}\n\n=== SCRAPED CONTEXT ===\n${scrapedContext}` : text,
        },
      ],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    })

    const cleanContent = extractResponse.choices?.[0]?.message?.content
    if (!cleanContent) return null
    const cleanData = JSON.parse(cleanContent)

    // LAYER 2: DEEP ANALYSIS & SCORING
    const analyzeResponse = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert tech recruiter. Analyze the perfectly structured JSON resume provided and return JSON grading it.

Return this EXACT structure:
{
  "score": 0-100,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "recommendations": ["..."]
}

Score: 90-100 excellent, 70-89 good, 50-69 average, below 50 needs work.
Strengths, weaknesses, and recommendations should be highly personalized to the structured content provided.`
        },
        {
          role: 'user',
          content: JSON.stringify(cleanData, null, 2)
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    })

    const scoreContent = analyzeResponse.choices?.[0]?.message?.content
    const scoreData = scoreContent ? JSON.parse(scoreContent) : { score: 50, strengths: [], weaknesses: [], recommendations: [] }

    return {
      score: scoreData.score ?? 50,
      name: cleanData.name || null,
      email: cleanData.email || null,
      linkedin: cleanData.linkedin || null,
      github: cleanData.github || null,
      sections: Array.isArray(cleanData.sections) ? cleanData.sections : [],
      strengths: Array.isArray(scoreData.strengths) ? scoreData.strengths : [],
      weaknesses: Array.isArray(scoreData.weaknesses) ? scoreData.weaknesses : [],
      recommendations: Array.isArray(scoreData.recommendations) ? scoreData.recommendations : [],
      rawText: text,
      predictedSeniority: cleanData.predictedSeniority || undefined,
      tone: cleanData.tone || undefined,
    }
  } catch (error) {
    logger.error('AI resume pipeline failed', { error: String(error) })
    return null
  }
}

async function extractAndMergeSkills(client: OpenAI, currentSections: DynamicSection[], githubRepos: any[]): Promise<DynamicSection | null> {
  try {
    const existingSkillsSection = currentSections.find(s => s.type === 'list' && s.acceptsAIImprovements)
      || currentSections.find(s => s.type === 'list' && (s.title.toLowerCase().includes('skill') || s.title.toLowerCase().includes('tech')))

    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an expert technical resume writer. Your job is to extract new technical skills from the provided GitHub repositories and merge them seamlessly into the user's existing Skills section. If no Skills section is provided, create a new one from scratch based on the GitHub data.
          
CRITICAL RULES:
1. Do NOT delete or drop ANY of the user's original skills.
2. Deduplicate similar skills (e.g., "React.js" and "React").
3. Return ONLY a JSON object representing the single updated Skills section matching this schema:
{
  "title": "Skills (or original title)",
  "type": "list",
  "items": ["Skill 1", "Skill 2"],
  "acceptsAIImprovements": true
}`
        },
        {
          role: 'user',
          content: JSON.stringify({ existingSkillsSection, githubRepositories: githubRepos }, null, 2)
        }
      ],
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    })
    
    const content = response.choices?.[0]?.message?.content
    if (!content) return null
    return JSON.parse(content)
  } catch (error) {
    logger.error('extractAndMergeSkills failed', { error: String(error) })
    return null
  }
}

async function weaveProjects(client: OpenAI, currentSections: DynamicSection[], githubRepos: any[], githubUsername?: string): Promise<DynamicSection | null> {
  try {
    const existingProjectsSection = currentSections.find(s => s.type === 'entries' && s.acceptsAIImprovements)
      || currentSections.find(s => s.type === 'entries' && (s.title.toLowerCase().includes('project') || s.title.toLowerCase().includes('open source') || s.title.toLowerCase().includes('experience')))

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert technical resume writer. Your job is to weave impressive GitHub repositories into the user's existing Projects or Experience section. If no Projects section is provided, create a new one from scratch based on the GitHub data.

CRITICAL RULES:
1. DEDUPLICATION: Cross-reference the GitHub repositories with the ORIGINAL PROJECTS. If a GitHub repo represents a project that is ALREADY in the original entries (matching by name or content), DO NOT create a new duplicate entry. Instead, elegantly update and improve the EXISTING entry's description with the new GitHub details (like technologies used, stars, links).
2. DO NOT overwrite, delete, or drop ANY of the user's original project or experience entries.
3. Select the most impressive NEW GitHub repos (e.g., high stars, relevant tech) and create new, highly professional action-oriented entries for them ONLY IF they are not already in the original projects.
4. Use the subtitle "Open Source Contribution" for new GitHub entries if appropriate.
5. Improve the tone and impact of existing weak bullet points across all entries.
6. Return ONLY a JSON object representing the single updated Projects/Experience section matching this schema:
{
  "title": "Projects (or original title)",
  "type": "entries",
  "entries": [{"title": "...", "subtitle": "...", "dates": "...", "description": "...", "link": "..."}],
  "acceptsAIImprovements": true
}`
        },
        {
          role: 'user',
          content: JSON.stringify({ 
            existingProjectsSection, 
            githubRepositories: githubRepos,
            githubProfileUrl: githubUsername ? `https://github.com/${githubUsername}` : undefined
          }, null, 2)
        }
      ],
      temperature: 0.2,
      max_tokens: 2500,
      response_format: { type: 'json_object' }
    })

    const content = response.choices?.[0]?.message?.content
    if (!content) return null
    return JSON.parse(content)
  } catch (error) {
    logger.error('weaveProjects failed', { error: String(error) })
    return null
  }
}

async function generateProfessionalSummary(client: OpenAI, skillsSection: DynamicSection | null, projectsSection: DynamicSection | null, githubRepos: any[]): Promise<DynamicSection | null> {
  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert technical resume writer. Your job is to write a highly professional, concise 3-sentence summary (profile) for the candidate.
          
CRITICAL RULES:
1. Base the summary tightly around their technical skills and project history.
2. Sound confident, action-oriented, and impactful.
3. Return ONLY a JSON object representing the Summary section matching this schema:
{
  "title": "Professional Summary",
  "type": "text",
  "text": "..."
}`
        },
        {
          role: 'user',
          content: JSON.stringify({ skillsSection, projectsSection, rawGithubRepos: githubRepos.length }, null, 2)
        }
      ],
      temperature: 0.4,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    })

    const content = response.choices?.[0]?.message?.content
    if (!content) return null
    return JSON.parse(content)
  } catch (error) {
    logger.error('generateProfessionalSummary failed', { error: String(error) })
    return null
  }
}

async function extractExperienceFromPortfolio(client: OpenAI, portfolioMarkdown: string): Promise<DynamicSection | null> {
  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert technical resume writer. Extract the candidate's work experience and education from the provided portfolio markdown.
          
CRITICAL RULES:
1. Identify all job roles, companies, dates, and bullet points of their professional work experience.
2. Formulate them into highly professional, action-oriented bullet points.
3. If you find Education details, you may include an education entry as well, or just focus on work experience.
4. Return ONLY a JSON object representing the Experience section matching this schema:
{
  "title": "Experience",
  "type": "entries",
  "entries": [{"title": "Role", "subtitle": "Company/Organization", "dates": "...", "description": "..."}],
  "acceptsAIImprovements": true
}
If no work experience can be found in the portfolio, return null or an empty entries list.`
        },
        {
          role: 'user',
          content: portfolioMarkdown.slice(0, 15000)
        }
      ],
      temperature: 0.1,
      max_tokens: 2500,
      response_format: { type: 'json_object' }
    })
    
    const content = response.choices?.[0]?.message?.content
    if (!content) return null
    const parsed = JSON.parse(content)
    if (!parsed || !Array.isArray(parsed.entries) || parsed.entries.length === 0) return null
    return parsed
  } catch (error) {
    logger.error('extractExperienceFromPortfolio failed', { error: String(error) })
    return null
  }
}

export async function generateImprovedResumeContent(
  originalSections: DynamicSection[],
  githubRepos: any[],
  githubUsername?: string,
  portfolioMarkdown?: string
): Promise<DynamicSection[]> {
  const client = createClient()
  if (!client) return originalSections

  try {
    // 1. Run Skills Extraction and Project Weaving in PARALLEL
    const promises = [
      extractAndMergeSkills(client, originalSections, githubRepos),
      weaveProjects(client, originalSections, githubRepos, githubUsername)
    ]
    
    let experiencePromise: Promise<DynamicSection | null> = Promise.resolve(null)
    if (portfolioMarkdown && originalSections.length === 0) {
       experiencePromise = extractExperienceFromPortfolio(client, portfolioMarkdown)
    }

    const [newSkillsSection, newProjectsSection, newExperienceSection] = await Promise.all([
      promises[0],
      promises[1],
      experiencePromise
    ]) as [DynamicSection | null, DynamicSection | null, DynamicSection | null]

    // 2. Generate the Summary based on the newly merged data
    const skillsForSummary = newSkillsSection || originalSections.find(s => s.type === 'list' && (s.acceptsAIImprovements || s.title.toLowerCase().includes('skill'))) || null
    const projectsForSummary = newProjectsSection || originalSections.find(s => s.type === 'entries' && (s.acceptsAIImprovements || s.title.toLowerCase().includes('project') || s.title.toLowerCase().includes('experience'))) || null
    const newSummarySection = await generateProfessionalSummary(client, skillsForSummary, projectsForSummary, githubRepos)

    // 3. Orchestrate the final sections array
    let finalSections: DynamicSection[] = []

    // Preserve summary at top
    if (newSummarySection && newSummarySection.text) {
      finalSections.push(newSummarySection)
    } else {
      const oldSummary = originalSections.find(s => s.type === 'text' && s.title.toLowerCase().includes('summary'))
      if (oldSummary) finalSections.push(oldSummary)
    }

    let pushedSkills = false
    let pushedProjects = false

    // Add remaining original sections, replacing Skills and Projects with our newly generated ones
    for (const section of originalSections) {
      if (section.type === 'text' && section.title.toLowerCase().includes('summary')) {
        continue // handled above
      }
      
      const isSkillsTarget = section.type === 'list' && (section.acceptsAIImprovements || section.title.toLowerCase().includes('skill') || section.title.toLowerCase().includes('tech'))
      const isProjectsTarget = section.type === 'entries' && (section.acceptsAIImprovements || section.title.toLowerCase().includes('project') || section.title.toLowerCase().includes('experience') || section.title.toLowerCase().includes('open source'))

      if (isSkillsTarget && newSkillsSection && !pushedSkills) {
        finalSections.push(newSkillsSection)
        pushedSkills = true
      } else if (isProjectsTarget && newProjectsSection && !pushedProjects) {
        finalSections.push(newProjectsSection)
        pushedProjects = true
      } else {
        finalSections.push(section)
      }
    }

    // If new sections were generated but not inserted (because original sections lacked targets), append them
    if (newExperienceSection) finalSections.push(newExperienceSection)
    if (newProjectsSection && !pushedProjects) finalSections.push(newProjectsSection)
    if (newSkillsSection && !pushedSkills) finalSections.push(newSkillsSection)

    return finalSections
  } catch (error) {
    logger.error('AI improved resume generation pipeline failed', { error: String(error) })
    return originalSections
  }
}

export async function analyzePortfolioWithAI(markdown: string): Promise<Partial<PortfolioAnalysis> | null> {
  const client = createClient()
  if (!client) return null

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an expert web portfolio auditor. Analyze the provided portfolio markdown and return JSON only.

Return this exact structure:
{
  "score": 0-100,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "recommendations": ["..."]
}

Score: 90-100 excellent, 70-89 good, 50-69 average, below 50 needs work.
Strengths, weaknesses, and recommendations should be tailored specifically to the portfolio content, tech stack, and design. Max 5 items per array. Use empty arrays if nothing applies. No markdown outside of the JSON.`,
        },
        {
          role: 'user',
          content: markdown.slice(0, 10000), // Protect against massive documents
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content)
    return {
      score: parsed.score ?? 50,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    }
  } catch (error) {
    logger.error('AI portfolio analysis failed', { error: String(error) })
    return null
  }
}

export async function generateRepoSummaries(repos: { name: string, description: string | null, language: string | null, readmeSummary: string | null }[]): Promise<{ name: string, professionalSummary: string, hasGoodReadme: boolean }[]> {
  const client = createClient()
  if (!client || repos.length === 0) return repos.map(r => ({ name: r.name, professionalSummary: r.description || `${r.language || 'Software'} project`, hasGoodReadme: true }))

  try {
    const prompt = `You are a professional resume writer. I will provide a list of GitHub repositories with their descriptions and a snippet of their README.
For each repository:
1. Evaluate if the README seems like a proper, helpful documentation for a software project (hasGoodReadme: boolean). If readmeSummary is null, hasGoodReadme MUST be false.
2. Write a single, highly professional, concise bullet point summarizing what the project is, suitable for a resume (professionalSummary: string). Make it sound impressive but accurate to the provided details. Keep it under 120 characters.
CRITICAL RULES FOR SUMMARIES:
- If the description is missing or just a few words, write "Developed an open-source [language] application." (e.g., "Developed an open-source Dart application.")
- If the description is only a URL, write "Developed a [language] web application deployed at [URL]."
- NEVER just return a raw URL or a phrase like "[Language] project with 2 stars". ALWAYS use action verbs (Developed, Designed, Engineered).

Input repositories:
${JSON.stringify(repos, null, 2)}

Return ONLY a JSON object with a 'summaries' array containing objects with this exact structure:
{
  "summaries": [
    {
      "name": "repo-name",
      "professionalSummary": "Developed a [language] application that does [X]...",
      "hasGoodReadme": true
    }
  ]
}`

    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    })

    const content = response.choices?.[0]?.message?.content
    if (!content) throw new Error('No content from Groq')

    const parsed = JSON.parse(content)
    return parsed.summaries || repos.map(r => ({ name: r.name, professionalSummary: r.description || `${r.language || 'Software'} project`, hasGoodReadme: true }))
  } catch (err) {
    logger.error('Failed to generate repo summaries', { error: err })
    return repos.map(r => ({ name: r.name, professionalSummary: r.description || `${r.language || 'Software'} project`, hasGoodReadme: true }))
  }
}

export function computeFallbackSummary(
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
    radar: { 
      presentation: portfolio ? portfolio.score : 0, 
      openSource: github ? github.score : 0, 
      experience: resume ? resume.score : 0, 
      techStack: fallbackScore, 
      consistency: fallbackScore 
    },
    normalFeedback: {
      overallScore: fallbackScore,
      summary: `Portfolio scored ${portfolio?.score ?? 'N/A'}, GitHub scored ${github?.score ?? 'N/A'}, Resume scored ${resume?.score ?? 'N/A'}.`,
      topStrengths: allStrengths.slice(0, 5),
    },
    deepFeedback: {
      topWeaknesses: allWeaknesses.slice(0, 5),
      topRecommendations: allRecommendations.slice(0, 5),
      radar: { 
        presentation: portfolio ? portfolio.score : 0, 
        openSource: github ? github.score : 0, 
        experience: resume ? resume.score : 0, 
        techStack: fallbackScore, 
        consistency: fallbackScore 
      },
    }
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
6. topStrengths, topWeaknesses, topRecommendations: combine from all sources, deduplicate, pick top 5 each, rephrase naturally. If there are no items for a category, return an empty array [], do NOT return strings like "No data available" in these arrays.

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
      normalFeedback: {
        overallScore: typeof parsed.overallScore === 'number' ? parsed.overallScore : computeFallbackSummary(portfolio, github, resume).overallScore,
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        topStrengths: toStrArr(parsed.topStrengths),
      },
      deepFeedback: {
        topWeaknesses: toStrArr(parsed.topWeaknesses),
        topRecommendations: toStrArr(parsed.topRecommendations),
        radar: {
          presentation: parsed.radar?.presentation ?? 50,
          openSource: parsed.radar?.openSource ?? 50,
          experience: parsed.radar?.experience ?? 50,
          techStack: parsed.radar?.techStack ?? 50,
          consistency: parsed.radar?.consistency ?? 50,
        },
      }
    }
  } catch (error) {
    logger.error('AI overall summary failed', { error: String(error) })
    return computeFallbackSummary(portfolio, github, resume)
  }
}

export interface IsolationResult {
  mismatches: AIMismatch[]
  validSources: {
    portfolio: boolean
    github: boolean
    resume: boolean
  }
}

export function evaluateTruthHierarchy(
  portfolio?: PortfolioAnalysis | null,
  github?: GitHubAnalysis | null,
  resume?: ResumeAnalysis | null
): IsolationResult {
  const result: IsolationResult = {
    mismatches: [],
    validSources: { portfolio: !!portfolio, github: !!github, resume: !!resume }
  }

  const expectedGithub = github?.details?.profile?.login?.toLowerCase()
  
  let portfolioGithub: string | null = null
  if (portfolio?.details?.socialLinks) {
    const pLinks = portfolio.details.socialLinks.filter(l => l.toLowerCase().includes('github.com'))
    for (const link of pLinks) {
      const match = link.match(/github\.com\/([A-Za-z0-9-]+)/i)
      if (match && match[1] && !link.includes('/blob/') && !link.includes('/commit/')) {
        portfolioGithub = match[1].toLowerCase()
        break
      }
    }
  }

  let resumeGithub: string | null = null
  if (resume?.details?.github) {
    const match = resume.details.github.match(/github\.com\/([A-Za-z0-9-]+)/i)
    if (match && match[1]) {
      resumeGithub = match[1].toLowerCase()
    }
  }

  // 1. Resume is the Master Truth if provided
  if (resume) {
    if (resumeGithub) {
      if (expectedGithub && expectedGithub !== resumeGithub) {
        result.validSources.github = false
        result.mismatches.push({
          type: 'github',
          severity: 'high',
          description: `Identity Mismatch: The GitHub profile you provided (${expectedGithub}) does not match the GitHub listed on your Resume (${resumeGithub}). The provided GitHub has been isolated from the cross-reference summary.`,
          sources: ['Resume', 'GitHub']
        })
      }
      if (portfolioGithub && portfolioGithub !== resumeGithub) {
        result.validSources.portfolio = false
        result.mismatches.push({
          type: 'github',
          severity: 'high',
          description: `Identity Mismatch: Your Portfolio links to a GitHub profile (${portfolioGithub}) that does not match your Resume (${resumeGithub}). The Portfolio has been isolated from the cross-reference summary.`,
          sources: ['Resume', 'Portfolio']
        })
      }
    } else {
       // Resume has no github. Portfolio becomes secondary truth.
       if (expectedGithub && portfolioGithub && expectedGithub !== portfolioGithub) {
          result.validSources.github = false
          result.mismatches.push({
            type: 'github',
            severity: 'high',
            description: `Identity Mismatch: The GitHub profile you provided (${expectedGithub}) does not match the GitHub linked on your Portfolio (${portfolioGithub}). The provided GitHub has been isolated.`,
            sources: ['Portfolio', 'GitHub']
          })
       }
    }
  } else {
    // 2. No resume. Portfolio is Ground Truth.
    if (portfolioGithub && expectedGithub && portfolioGithub !== expectedGithub) {
      result.validSources.github = false
      result.mismatches.push({
        type: 'github',
        severity: 'high',
        description: `Identity Mismatch: The GitHub profile you provided (${expectedGithub}) does not match the GitHub linked on your Portfolio (${portfolioGithub}). The provided GitHub has been isolated from the cross-reference summary.`,
        sources: ['Portfolio', 'GitHub']
      })
    }
  }

  return result
}

export async function detectMismatches(
  portfolio?: PortfolioAnalysis | null,
  github?: GitHubAnalysis | null,
  resume?: ResumeAnalysis | null
): Promise<AIMismatch[]> {
  const client = createClient()
  if (!client) return []

  const sourcesData: Record<string, unknown> = {}
  
  if (portfolio) {
    sourcesData.portfolio = {
      name: portfolio.details?.authorName || null,
      socialLinks: portfolio.details?.socialLinks || [],
      projects: portfolio.details?.projectLinks || []
    }
  }
  
  if (github) {
    sourcesData.github = {
      name: github.details?.profile?.name || null,
      username: github.details?.profile?.login || null,
      repos: github.details?.repos?.map(r => r.name) || []
    }
  }
  
  if (resume) {
    sourcesData.resume = {
      name: resume.details?.name || null,
      socialLinks: [resume.details?.github, resume.details?.linkedin].filter(Boolean) || [],
      skills: resume.details?.skills?.map(s => s.name) || []
    }
  }

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are an AI auditor. Cross-reference the developer's identity, links, and projects across Portfolio, GitHub, and Resume.
Find discrepancies (mismatches) across the provided sources.

Look for:
1. "name" mismatches (e.g. John on Resume, Jane on GitHub).
2. "link" or "github" mismatches (e.g. Resume links to github.com/foo, but the actual github username is bar).
3. "project" mismatches (e.g. Portfolio links to project X, but GitHub has no repo for it).

Severity:
- "high": Completely different names, linking to wrong GitHub profile.
- "medium": Missing major projects across platforms.
- "low": Missing social links on one platform but present on another.

If there are no major mismatches, return an empty array.
Return JSON ONLY:
{
  "mismatches": [
    {
      "type": "name" | "github" | "linkedin" | "project" | "other",
      "severity": "high" | "medium" | "low",
      "description": "Clear explanation of the mismatch AND a specific, actionable recommendation on how to fix it (e.g. 'Update your GitHub display name to match your portfolio name to appear more professional.')",
      "sources": ["Portfolio", "GitHub", "Resume"] // list the sources involved
    }
  ]
}`
        },
        {
          role: 'user',
          content: `Data:\n${JSON.stringify(sourcesData, null, 2)}`
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })

    const content = response.choices?.[0]?.message?.content
    if (!content) return []
    
    const parsed = JSON.parse(content)
    return Array.isArray(parsed.mismatches) ? parsed.mismatches : []
  } catch (error) {
    logger.error('Mismatch detection failed', { error: String(error) })
    return []
  }
}
