import { type NextRequest } from 'next/server'
import { githubReviewSchema } from '@/validations/review'
import { gitHubService } from '@/features/github/services/github.service'
import { successResponse, errorResponse } from '@/utils/api'
import { createClient } from '@/lib/supabase/server'
import { creditRepository } from '@/features/credits/repositories/credit.repository'

import { getAnalysisCost } from '@/config/pricing'

const CREDIT_COST = getAnalysisCost('github')

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const body = await request.json()
    const parsed = githubReviewSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 400, parsed.error.issues.map(i => i.message))
    }

    if (user) {
      const credits = await creditRepository.getUserCredits(user.id)
      if (credits < CREDIT_COST) {
        return errorResponse(`Insufficient credits. You need ${CREDIT_COST} credits to analyze a GitHub profile.`, 402)
      }

      const deducted = await creditRepository.deductCredits(user.id, CREDIT_COST)
      if (!deducted) {
        return errorResponse('Failed to deduct credits. Please try again.', 500)
      }
    }

    const result = await gitHubService.analyze(parsed.data.githubUsername)
    return successResponse(result, 'GitHub analysis complete')
  } catch {
    return errorResponse('GitHub analysis failed', 500)
  }
}
