import { NextRequest } from 'next/server'
import { successResponse, errorResponse, serverErrorResponse } from '@/utils/api'
import { generateOverallSummary, detectMismatches } from '@/features/ai/services/ai.service'
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

    const [summary, mismatches] = await Promise.all([
      generateOverallSummary(portfolio, github, resume),
      Promise.resolve(detectMismatches(portfolio, github, resume)),
    ])

    return successResponse({ summary, mismatches }, 'AI summary generated')
  } catch (error) {
    return serverErrorResponse(error)
  }
}
