import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reviewService } from '@/features/reviews/services/review.service'
import { successResponse, errorResponse, unauthorizedResponse } from '@/utils/api'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return unauthorizedResponse()

    const { id } = await params
    const review = await reviewService.getReviewById(id)

    if (!review) return errorResponse('Review not found', 404)
    if (review.user_id !== user.id) return unauthorizedResponse()

    return successResponse(review, 'Review fetched')
  } catch {
    return errorResponse('Failed to fetch review', 500)
  }
}
