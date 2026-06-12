import { NextRequest } from 'next/server'
import { successResponse, errorResponse, serverErrorResponse } from '@/utils/api'
import { generateOverallSummary, detectMismatches, checkHardMismatches } from '@/features/ai/services/ai.service'
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

    const hardMismatches = checkHardMismatches(portfolio, github, resume)
    if (hardMismatches && hardMismatches.length > 0) {
      // Abort AI cross-reference to save tokens
      const abortedSummary = {
        summary: "Cross-referencing aborted due to severe identity mismatch across provided sources. Please resolve the broken links below.",
        radar: { presentation: 0, openSource: 0, experience: 0, techStack: 0, consistency: 0 },
        overallScore: 0,
        topStrengths: [],
        topWeaknesses: ["Identity mismatch detected."],
        topRecommendations: ["Fix your profile links to ensure identity consistency."],
        sourceBreakdown: {
          portfolio: portfolio ? { score: portfolio.score, summary: 'Identity mismatch detected.' } : null,
          github: github ? { score: github.score, summary: 'Identity mismatch detected.' } : null,
          resume: resume ? { score: resume.score, summary: 'Identity mismatch detected.' } : null
        }
      }
      return successResponse({
        summary: abortedSummary,
        mismatches: hardMismatches
      }, 'AI summary generated')
    }

    const [summary, mismatches] = await Promise.all([
      generateOverallSummary(portfolio, github, resume),
      detectMismatches(portfolio, github, resume),
    ])

    return successResponse({ summary, mismatches }, 'AI summary generated')
  } catch (error) {
    return serverErrorResponse(error)
  }
}
