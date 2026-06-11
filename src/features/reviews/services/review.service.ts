import type { Review, PortfolioAnalysis, GitHubAnalysis, ResumeAnalysis } from '@/types'
import { SCORE_WEIGHTS } from '@/constants'
import { portfolioService } from './portfolio.service'
import { gitHubService } from '@/features/github/services/github.service'
import { resumeService } from '@/features/resume/services/resume.service'
import { reviewRepository } from '@/features/reviews/repositories/review.repository'
import { reportRepository } from '@/features/reports/repositories/report.repository'
import { subscriptionRepository } from '@/features/subscriptions/repositories/subscription.repository'
import { logger } from '@/lib/logger'
import { PLANS } from '@/constants'

export class ReviewService {
  async createFullReview(
    userId: string,
    data: {
      portfolioUrl?: string
      githubUsername?: string
      resumeBuffer?: Buffer
      resumeFileName?: string
    }
  ): Promise<Review> {
    const subscription = await subscriptionRepository.getUserSubscription(userId)
    const plan = (subscription?.plan as keyof typeof PLANS) || 'free'
    const planConfig = PLANS[plan]
    const limit = planConfig.reviewsPerMonth

    if (limit > 0) {
      const monthlyCount = await reviewRepository.getMonthlyReviewCount(userId)
      if (monthlyCount >= limit) {
        throw new Error(`Free plan limit reached. You have used ${monthlyCount}/${limit} reviews this month. Upgrade to Pro for unlimited reviews.`)
      }
    }

    const calls: Promise<void>[] = []
    let portfolioResult: PortfolioAnalysis | null = null
    let githubResult: GitHubAnalysis | null = null
    let resumeResult: ResumeAnalysis | null = null

    if (data.portfolioUrl) {
      calls.push(
        portfolioService.analyze(data.portfolioUrl).then((r) => { portfolioResult = r })
      )
    }

    if (data.githubUsername) {
      calls.push(
        gitHubService.analyze(data.githubUsername).then((r) => { githubResult = r })
      )
    }

    if (data.resumeBuffer) {
      calls.push(
        resumeService.analyze(data.resumeBuffer, data.resumeFileName || 'resume.pdf').then((r) => { resumeResult = r })
      )
    }

    await Promise.all(calls)

    const pScore = (portfolioResult as PortfolioAnalysis | null)?.score ?? 0
    const gScore = (githubResult as GitHubAnalysis | null)?.score ?? 0
    const rScore = (resumeResult as ResumeAnalysis | null)?.score ?? 0

    const overallScore = Math.round(
      pScore * SCORE_WEIGHTS.portfolio +
      gScore * SCORE_WEIGHTS.github +
      rScore * SCORE_WEIGHTS.resume
    )

    const review = await reviewRepository.createReview({
      user_id: userId,
      portfolio_url: data.portfolioUrl || null,
      github_username: data.githubUsername || null,
      resume_url: data.resumeFileName || null,
      overall_score: overallScore,
      portfolio_score: pScore || null,
      github_score: gScore || null,
      resume_score: rScore || null,
    })

    const allStrengths = [
      ...((portfolioResult as PortfolioAnalysis | null)?.strengths || []),
      ...((githubResult as GitHubAnalysis | null)?.strengths || []),
      ...((resumeResult as ResumeAnalysis | null)?.strengths || []),
    ]
    const allWeaknesses = [
      ...((portfolioResult as PortfolioAnalysis | null)?.weaknesses || []),
      ...((githubResult as GitHubAnalysis | null)?.weaknesses || []),
      ...((resumeResult as ResumeAnalysis | null)?.weaknesses || []),
    ]
    const allRecommendations = [
      ...((portfolioResult as PortfolioAnalysis | null)?.recommendations || []),
      ...((githubResult as GitHubAnalysis | null)?.recommendations || []),
      ...((resumeResult as ResumeAnalysis | null)?.recommendations || []),
    ]

    await reportRepository.createReport({
      review_id: review.id,
      strengths: allStrengths,
      weaknesses: allWeaknesses,
      recommendations: allRecommendations,
    })

    logger.info('Review created', { reviewId: review.id, userId, overallScore })
    return review
  }

  async getUserReviews(userId: string) {
    return reviewRepository.getUserReviews(userId)
  }

  async getReviewById(reviewId: string) {
    return reviewRepository.getReviewById(reviewId)
  }
}

export const reviewService = new ReviewService()
