import { NextRequest } from 'next/server'
import { successResponse, errorResponse, serverErrorResponse } from '@/utils/api'
import { generateOverallSummary, detectMismatches, evaluateTruthHierarchy, computeFallbackSummary } from '@/features/ai/services/ai.service'
import type { PortfolioAnalysis, GitHubAnalysis, ResumeAnalysis } from '@/types'
import { createClient } from '@/lib/supabase/server'
import { creditRepository } from '@/features/credits/repositories/credit.repository'

const CREDIT_COST = 1 // Final AI Synthesis cost

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const { portfolio, github, resume } = body as {
      portfolio?: PortfolioAnalysis
      github?: GitHubAnalysis
      resume?: ResumeAnalysis
    }

    if (!portfolio && !github && !resume) {
      return errorResponse('At least one analysis source is required')
    }

    if (user) {
      const credits = await creditRepository.getUserCredits(user.id)
      if (credits < CREDIT_COST) {
        return errorResponse(`Insufficient credits. You need ${CREDIT_COST} credits to synthesize the final summary.`, 402)
      }

      const deducted = await creditRepository.deductCredits(user.id, CREDIT_COST)
      if (!deducted) {
        return errorResponse('Failed to deduct credits. Please try again.', 500)
      }
    }

    const truth = evaluateTruthHierarchy(portfolio, github, resume)


    // Remove isolated sources before AI processing
    const validPortfolio = truth.validSources.portfolio ? portfolio : undefined
    const validGithub = truth.validSources.github ? github : undefined
    const validResume = truth.validSources.resume ? resume : undefined

    const validCount = [validPortfolio, validGithub, validResume].filter(Boolean).length

    if (validCount < 2 && truth.mismatches.length > 0) {
      // Abort AI cross-reference but preserve individual analysis recommendations and radar!
      const fallback = computeFallbackSummary(portfolio, github, resume)
      fallback.summary = "Cross-referencing aborted due to severe identity mismatch. Showing isolated analysis results below."
      fallback.overallScore = 0
      
      // We do NOT zero out the radar here because everything is isolated, so we just show their individual scores.
      // Or we can zero out the invalid ones if we want to be strict, but the user requested individual scores to be preserved.
      
      return successResponse({
        summary: fallback,
        mismatches: truth.mismatches
      }, 'AI summary generated')
    }

    // Generate summary using ONLY the valid sources
    const [summary, aiMismatches] = await Promise.all([
      generateOverallSummary(validPortfolio, validGithub, validResume),
      validCount > 1 ? detectMismatches(validPortfolio, validGithub, validResume) : Promise.resolve([]),
    ])

    const combinedMismatches = [...truth.mismatches, ...aiMismatches]

    // Inject isolated source recommendations back into the global list so they aren't lost
    if (!truth.validSources.portfolio && portfolio) {
      if (summary.sourceBreakdown.portfolio) summary.sourceBreakdown.portfolio.summary = 'Isolated: ' + (portfolio.strengths[0] || 'Analyzed')
    }
    if (!truth.validSources.github && github) {
      if (summary.sourceBreakdown.github) summary.sourceBreakdown.github.summary = 'Isolated: ' + (github.strengths[0] || 'Analyzed')
    }
    if (!truth.validSources.resume && resume) {
      if (summary.sourceBreakdown.resume) summary.sourceBreakdown.resume.summary = 'Isolated: ' + (resume.strengths[0] || 'Analyzed')
    }

    // Deduplicate lists just in case
    summary.topStrengths = Array.from(new Set(summary.topStrengths)).slice(0, 6)
    summary.topWeaknesses = Array.from(new Set(summary.topWeaknesses)).slice(0, 6)
    summary.topRecommendations = Array.from(new Set(summary.topRecommendations)).slice(0, 6)

    // Isolated sources don't contribute to the overall unified radar score.
    if (!truth.validSources.github && summary.radar) summary.radar.openSource = 0
    if (!truth.validSources.portfolio && summary.radar) summary.radar.presentation = 0
    if (!truth.validSources.resume && summary.radar) summary.radar.experience = 0

    return successResponse({ summary, mismatches: combinedMismatches }, 'AI summary generated')
  } catch (error) {
    return serverErrorResponse(error)
  }
}
