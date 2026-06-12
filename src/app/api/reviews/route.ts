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
    const cookieStore = await cookies()

    // Handle Guest Session
    if (!userId) {
      const guestCookie = cookieStore.get('portfolio_guest_id')
      if (guestCookie?.value) {
        userId = guestCookie.value
      } else {
        userId = crypto.randomUUID()
        // Next.js 13+ allows setting cookies in POST route handlers
        cookieStore.set('portfolio_guest_id', userId, {
          maxAge: 60 * 60 * 24 * 30, // 30 days
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/'
        })
      }
    }

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

    const review = await reviewService.createFullReview(userId, {
      portfolioUrl: portfolioUrl || undefined,
      githubUsername: githubUsername || undefined,
      resumeBuffer,
      resumeFileName,
    })

    return successResponse(review, 'Review created successfully')
  } catch {
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
