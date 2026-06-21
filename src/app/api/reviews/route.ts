import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reviewService } from '@/features/reviews/services/review.service'
import { successResponse, errorResponse, unauthorizedResponse } from '@/utils/api'
import type {
  PortfolioAnalysis,
  GitHubAnalysis,
  ResumeAnalysis,
  AISummaryResult,
  AIMismatch,
} from '@/types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    const userId = user?.id

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      const {
        portfolioUrl,
        githubUsername,
        resumeFileName,
        portfolio,
        github,
        resume,
        aiSummary,
        mismatches,
      } = body as {
        portfolioUrl?: string
        githubUsername?: string
        resumeFileName?: string
        portfolio?: PortfolioAnalysis | null
        github?: GitHubAnalysis | null
        resume?: ResumeAnalysis | null
        aiSummary?: AISummaryResult | null
        mismatches?: AIMismatch[]
      }

      if (!userId) {
        // Fallback mode: return success but don't save to DB so the frontend doesn't crash
        return successResponse({ id: 'fallback-no-save' }, 'Analysis complete (Guest Fallback Mode - Not Saved)')
      }

      const review = await reviewService.saveReviewWithResults(userId, {
        portfolioUrl,
        githubUsername,
        resumeFileName,
        portfolio,
        github,
        resume,
        aiSummary,
        mismatches,
      })

      return successResponse(review, 'Review saved successfully')
    }

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

    if (!userId) {
      return errorResponse('Guest users cannot process files via form data endpoints. Please use the JSON endpoint.', 401)
    }

    const review = await reviewService.createFullReview(userId, {
      portfolioUrl: portfolioUrl || undefined,
      githubUsername: githubUsername || undefined,
      resumeBuffer,
      resumeFileName,
    })

    return successResponse(review, 'Review created successfully')
  } catch (error) {
    console.error('Save review API Error:', error)
    return errorResponse('Review creation failed', 500)
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      return unauthorizedResponse('No active session found')
    }

    const reviews = await reviewService.getUserReviews(user.id)
    return successResponse(reviews, 'Reviews fetched successfully')
  } catch {
    return errorResponse('Failed to fetch reviews', 500)
  }
}
