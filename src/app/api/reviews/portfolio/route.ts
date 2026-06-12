import { type NextRequest } from 'next/server'
import { portfolioReviewSchema } from '@/validations/review'
import { portfolioService } from '@/features/reviews/services/portfolio.service'
import { successResponse, errorResponse } from '@/utils/api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = portfolioReviewSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 400, parsed.error.issues.map(i => i.message))
    }

    const result = await portfolioService.analyze(parsed.data.portfolioUrl)
    return successResponse(result, 'Portfolio analysis complete')
  } catch (error) {
    console.error('Portfolio API Error:', error)
    return errorResponse('Portfolio analysis failed', 500)
  }
}
