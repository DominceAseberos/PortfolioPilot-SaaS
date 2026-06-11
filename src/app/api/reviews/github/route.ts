import { type NextRequest } from 'next/server'
import { githubReviewSchema } from '@/validations/review'
import { gitHubService } from '@/features/github/services/github.service'
import { successResponse, errorResponse } from '@/utils/api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = githubReviewSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('Validation failed', 400, parsed.error.issues.map(i => i.message))
    }

    const result = await gitHubService.analyze(parsed.data.githubUsername)
    return successResponse(result, 'GitHub analysis complete')
  } catch (error) {
    return errorResponse('GitHub analysis failed', 500)
  }
}
