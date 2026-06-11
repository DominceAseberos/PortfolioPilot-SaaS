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
    const plan = subscription?.plan || 'free'
    const limit = PLANS[plan].reviewsPerMonth

    if (limit > 0) {
      const monthlyCount = await reviewRepository.getMonthlyReviewCount(userId)
      if (monthlyCount >= limit) {
        throw new Error(`Free plan limit reached. You have used ${monthlyCount}/${limit} reviews this month. Upgrade to Pro for unlimited reviews.`)
      }
    }

    let portfolioResult: PortfolioAnalysis | null = null
    let githubResult: GitHubAnalysis | null = null
    let resumeResult: ResumeAnalysis | null = null

    const analyses: Promise<void>[] = []

    if (data.portfolioUrl) {
      analyses.push(
        portfolioService.analyze(data.portfolioUrl).then((r) => { portfolioResult = r })
      )
    }

    if (data.githubUsername) {
      analyses.push(
        gitHubService.analyze(data.githubUsername).then((r) => { githubResult = r })
      )
    }

    if (data.resumeBuffer) {
      analyses.push(
        resumeService.analyze(data.resumeBuffer, data.resumeFileName || 'resume.pdf').then((r) => { resumeResult = r })
      )
    }

    await Promise.all(analyses)

    const overallScore = Math.round(
      ((portfolioResult?.score || 0) * SCORE_WEIGHTS.portfolio) +
      ((githubResult?.score || 0) * SCORE_WEIGHTS.github) +
      ((resumeResult?.score || 0) * SCORE_WEIGHTS.resume)
    )

    const review = await reviewRepository.createReview({
      user_id: userId,
      portfolio_url: data.portfolioUrl || null,
      github_username: data.githubUsername || null,
      resume_url: data.resumeFileName || null,
      overall_score: overallScore,
      portfolio_score: portfolioResult?.score || null,
      github_score: githubResult?.score || null,
      resume_score: resumeResult?.score || null,
    })

    const allStrengths = [
      ...(portfolioResult?.strengths || []),
      ...(githubResult?.strengths || []),
      ...(resumeResult?.strengths || []),
    ]
    const allWeaknesses = [
      ...(portfolioResult?.weaknesses || []),
      ...(githubResult?.weaknesses || []),
      ...(resumeResult?.weaknesses || []),
    ]
    const allRecommendations = [
      ...(portfolioResult?.recommendations || []),
      ...(githubResult?.recommendations || []),
      ...(resumeResult?.recommendations || []),
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
