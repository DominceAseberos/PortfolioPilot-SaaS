import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reviewService } from '@/features/reviews/services/review.service'
import { successResponse, errorResponse, unauthorizedResponse } from '@/utils/api'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return unauthorizedResponse()

    const formData = await request.formData()
    const portfolioUrl = formData.get('portfolioUrl') as string | null
    const githubUsername = formData.get('githubUsername') as string | null
    const resumeFile = formData.get('resume') as File | null

    let resumeBuffer: Buffer | undefined
    let resumeFileName: string | undefined

    if (resumeFile) {
      resumeBuffer = Buffer.from(await resumeFile.arrayBuffer())
      resumeFileName = resumeFile.name
    }

    const review = await reviewService.createFullReview(user.id, {
      portfolioUrl: portfolioUrl || undefined,
      githubUsername: githubUsername || undefined,
      resumeBuffer,
      resumeFileName,
    })

    return successResponse(review, 'Review created successfully')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Review creation failed'
    return errorResponse(message, 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return unauthorizedResponse()

    const reviews = await reviewService.getUserReviews(user.id)
    return successResponse(reviews, 'Reviews fetched successfully')
  } catch (error) {
    return errorResponse('Failed to fetch reviews', 500)
  }
}
