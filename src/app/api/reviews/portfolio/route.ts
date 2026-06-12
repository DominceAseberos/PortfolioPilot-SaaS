import { type NextRequest } from 'next/server'
import { portfolioReviewSchema } from '@/validations/review'
import { portfolioService } from '@/features/reviews/services/portfolio.service'
import { successResponse, errorResponse } from '@/utils/api'
import { createClient } from '@/lib/supabase/server'
import { creditRepository } from '@/features/credits/repositories/credit.repository'

const CREDIT_COST = 2 // Deep UI Portfolio Analysis

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse('Unauthorized. Please log in to run AI analysis.', 401)
    }

    const body = await request.json()
    const parsed = portfolioReviewSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 400, parsed.error.issues.map(i => i.message))
    }

    const credits = await creditRepository.getUserCredits(user.id)
    if (credits < CREDIT_COST) {
      return errorResponse(`Insufficient credits. You need ${CREDIT_COST} credits to analyze a portfolio.`, 402)
    }

    const deducted = await creditRepository.deductCredits(user.id, CREDIT_COST)
    if (!deducted) {
      return errorResponse('Failed to deduct credits. Please try again.', 500)
    }

    const result = await portfolioService.analyze(parsed.data.portfolioUrl)
    return successResponse(result, 'Portfolio analysis complete')
  } catch (error) {
    console.error('Portfolio API Error:', error)
    return errorResponse('Portfolio analysis failed', 500)
  }
}
