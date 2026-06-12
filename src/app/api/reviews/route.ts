import { type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { reviewService } from '@/features/reviews/services/review.service'
import { successResponse, errorResponse, unauthorizedResponse } from '@/utils/api'
import crypto from 'crypto'
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
    
    let userId = user?.id

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
        // Guest mode: do not save to DB, just return the data so UI works
        return successResponse({
          id: 'guest_review_' + Date.now(),
          user_id: 'guest',
          overall_score: aiSummary?.overallScore ?? 0,
          created_at: new Date().toISOString(),
          full_results: { portfolio, github, resume, aiSummary, mismatches }
        }, 'Review processed successfully (Guest mode)')
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
    
    let userId = user?.id

    if (!userId) {
      const cookieStore = await cookies()
      const guestCookie = cookieStore.get('portfolio_guest_id')
      if (guestCookie?.value) {
        userId = guestCookie.value
      } else {
        return unauthorizedResponse('Not logged in and no guest session found')
      }
    }

    const reviews = await reviewService.getUserReviews(userId)
    return successResponse(reviews, 'Reviews fetched successfully')
  } catch {
    return errorResponse('Failed to fetch reviews', 500)
  }
}
