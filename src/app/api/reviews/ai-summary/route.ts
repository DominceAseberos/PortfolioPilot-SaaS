import { NextRequest } from 'next/server'
import { successResponse, errorResponse, serverErrorResponse } from '@/utils/api'
import { generateOverallSummary, detectMismatches, evaluateTruthHierarchy } from '@/features/ai/services/ai.service'
import type { PortfolioAnalysis, GitHubAnalysis, ResumeAnalysis } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { portfolio, github, resume } = body as {
      portfolio?: PortfolioAnalysis
      github?: GitHubAnalysis
      resume?: ResumeAnalysis
    }

    if (!portfolio && !github && !resume) {
      return errorResponse('At least one analysis source is required')
    }

    const truth = evaluateTruthHierarchy(portfolio, github, resume)

    // Remove isolated sources before AI processing
    const validPortfolio = truth.validSources.portfolio ? portfolio : undefined
    const validGithub = truth.validSources.github ? github : undefined
    const validResume = truth.validSources.resume ? resume : undefined

    // Check if at least 2 sources remain to cross-reference
    const validCount = [validPortfolio, validGithub, validResume].filter(Boolean).length

    if (validCount < 2 && truth.mismatches.length > 0) {
      // Abort AI cross-reference entirely because nothing matches
      const abortedSummary = {
        summary: "Cross-referencing aborted due to severe identity mismatch. Please resolve the conflicting identities across your provided sources.",
        radar: { presentation: 0, openSource: 0, experience: 0, techStack: 0, consistency: 0 },
        overallScore: 0,
        topStrengths: [],
        topWeaknesses: ["Identity mismatch detected."],
        topRecommendations: ["Fix your profile links to ensure identity consistency."],
        sourceBreakdown: {
          portfolio: portfolio ? { score: portfolio.score, summary: truth.validSources.portfolio ? 'Analyzed' : 'Identity mismatch detected.' } : null,
          github: github ? { score: github.score, summary: truth.validSources.github ? 'Analyzed' : 'Identity mismatch detected.' } : null,
          resume: resume ? { score: resume.score, summary: truth.validSources.resume ? 'Analyzed' : 'Identity mismatch detected.' } : null
        }
      }
      return successResponse({
        summary: abortedSummary,
        mismatches: truth.mismatches
      }, 'AI summary generated')
    }

    // Generate summary using ONLY the valid sources
    const [summary, aiMismatches] = await Promise.all([
      generateOverallSummary(validPortfolio, validGithub, validResume),
      detectMismatches(validPortfolio, validGithub, validResume),
    ])

    const combinedMismatches = [...truth.mismatches, ...aiMismatches]

    // If a source was isolated, its radar score should be 0.
    if (!truth.validSources.github && summary.radar) summary.radar.openSource = 0
    if (!truth.validSources.portfolio && summary.radar) summary.radar.presentation = 0
    if (!truth.validSources.resume && summary.radar) summary.radar.experience = 0

    return successResponse({ summary, mismatches: combinedMismatches }, 'AI summary generated')
  } catch (error) {
    return serverErrorResponse(error)
  }
}
