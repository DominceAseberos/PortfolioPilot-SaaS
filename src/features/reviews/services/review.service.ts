import type {
  Review,
  PortfolioAnalysis,
  GitHubAnalysis,
  ResumeAnalysis,
  ReviewFullResults,
} from '@/types'
import { SCORE_WEIGHTS } from '@/constants'
import { portfolioService } from './portfolio.service'
import { gitHubService } from '@/features/github/services/github.service'
import { resumeService } from '@/features/resume/services/resume.service'
import { reviewRepository } from '@/features/reviews/repositories/review.repository'
import { reportRepository } from '@/features/reports/repositories/report.repository'
import { subscriptionRepository } from '@/features/subscriptions/repositories/subscription.repository'
import { logger } from '@/lib/logger'
import { PLANS } from '@/constants'

function detectName(
  portfolio?: PortfolioAnalysis | null,
  github?: GitHubAnalysis | null,
  resume?: ResumeAnalysis | null
): string | null {
  if (resume?.details?.name) return resume.details.name
  if (github?.details?.profile?.name) return github.details.profile.name
  return null
}

function detectSourceTypes(
  portfolio?: PortfolioAnalysis | null,
  github?: GitHubAnalysis | null,
  resume?: ResumeAnalysis | null
): string[] {
  const types: string[] = []
  if (portfolio) types.push('portfolio')
  if (github) types.push('github')
  if (resume) types.push('resume')
  return types
}

function computeOverallScore(
  portfolio?: PortfolioAnalysis | null,
  github?: GitHubAnalysis | null,
  resume?: ResumeAnalysis | null
): number {
  const pScore = portfolio?.score ?? 0
  const gScore = github?.score ?? 0
  const rScore = resume?.score ?? 0
  const totalWeight = SCORE_WEIGHTS.portfolio + SCORE_WEIGHTS.github + SCORE_WEIGHTS.resume
  const weighted =
    pScore * SCORE_WEIGHTS.portfolio + gScore * SCORE_WEIGHTS.github + rScore * SCORE_WEIGHTS.resume
  return totalWeight > 0 ? Math.round(weighted / totalWeight) : 0
}

export class ReviewService {
  async saveReviewWithResults(
    userId: string,
    data: {
      portfolioUrl?: string
      githubUsername?: string
      resumeFileName?: string
      portfolio?: PortfolioAnalysis | null
      github?: GitHubAnalysis | null
      resume?: ResumeAnalysis | null
      aiSummary?: ReviewFullResults['aiSummary']
      mismatches?: ReviewFullResults['mismatches']
    }
  ): Promise<Review> {
    const subscription = await subscriptionRepository.getUserSubscription(userId)
    if (process.env.NODE_ENV !== 'development') {
      const plan = (subscription?.plan as keyof typeof PLANS) || 'free'
      const planConfig = PLANS[plan]
      const limit = planConfig.reviewsPerMonth
      if (limit > 0) {
        const monthlyCount = await reviewRepository.getMonthlyReviewCount(userId)
        if (monthlyCount >= limit) {
          throw new Error(
            `Free plan limit reached. You have used ${monthlyCount}/${limit} reviews this month. Upgrade to Pro for unlimited reviews.`
          )
        }
      }
    }

    const portfolio = data.portfolio ?? null
    const github = data.github ?? null
    const resume = data.resume ?? null
    const name = detectName(portfolio, github, resume)
    const sourceTypes = detectSourceTypes(portfolio, github, resume)
    const overallScore = computeOverallScore(portfolio, github, resume)

    const fullResults: ReviewFullResults = {
      portfolio,
      github,
      resume,
      aiSummary: data.aiSummary ?? null,
      mismatches: data.mismatches ?? [],
    }

    const review = await reviewRepository.createReview({
      user_id: userId,
      portfolio_url: data.portfolioUrl || null,
      github_username: data.githubUsername || null,
      resume_url: data.resumeFileName || null,
      overall_score: overallScore,
      portfolio_score: portfolio?.score ?? null,
      github_score: github?.score ?? null,
      resume_score: resume?.score ?? null,
      detected_name: name,
      source_types: sourceTypes,
      full_results: fullResults,
    })

    const allStrengths = [
      ...(portfolio?.strengths ?? []),
      ...(github?.strengths ?? []),
      ...(resume?.strengths ?? []),
    ]
    const allWeaknesses = [
      ...(portfolio?.weaknesses ?? []),
      ...(github?.weaknesses ?? []),
      ...(resume?.weaknesses ?? []),
    ]
    const allRecommendations = [
      ...(portfolio?.recommendations ?? []),
      ...(github?.recommendations ?? []),
      ...(resume?.recommendations ?? []),
    ]

    await reportRepository.createReport({
      review_id: review.id,
      strengths: allStrengths,
      weaknesses: allWeaknesses,
      recommendations: allRecommendations,
    })

    logger.info('Review saved with results', {
      reviewId: review.id,
      userId,
      overallScore,
      name,
      sourceTypes: sourceTypes.join(','),
    })
    return review
  }

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
    if (process.env.NODE_ENV !== 'development') {
      const plan = (subscription?.plan as keyof typeof PLANS) || 'free'
      const planConfig = PLANS[plan]
      const limit = planConfig.reviewsPerMonth
      if (limit > 0) {
        const monthlyCount = await reviewRepository.getMonthlyReviewCount(userId)
        if (monthlyCount >= limit) {
          throw new Error(
            `Free plan limit reached. You have used ${monthlyCount}/${limit} reviews this month. Upgrade to Pro for unlimited reviews.`
          )
        }
      }
    }

    const calls: Promise<void>[] = []
    let portfolioResult: PortfolioAnalysis | null = null
    let githubResult: GitHubAnalysis | null = null
    let resumeResult: ResumeAnalysis | null = null

    if (data.portfolioUrl) {
      calls.push(
        portfolioService.analyze(data.portfolioUrl).then((r) => {
          portfolioResult = r
        })
      )
    }

    if (data.githubUsername) {
      calls.push(
        gitHubService.analyze(data.githubUsername).then((r) => {
          githubResult = r
        })
      )
    }

    if (data.resumeBuffer) {
      calls.push(
        resumeService.analyze(data.resumeBuffer, data.resumeFileName || 'resume.pdf').then((r) => {
          resumeResult = r
        })
      )
    }

    await Promise.all(calls)

    const pResult = portfolioResult as PortfolioAnalysis | null
    const gResult = githubResult as GitHubAnalysis | null
    const rResult = resumeResult as ResumeAnalysis | null

    const name = detectName(pResult, gResult, rResult)
    const sourceTypes = detectSourceTypes(pResult, gResult, rResult)
    const overallScore = computeOverallScore(pResult, gResult, rResult)

    const review = await reviewRepository.createReview({
      user_id: userId,
      portfolio_url: data.portfolioUrl || null,
      github_username: data.githubUsername || null,
      resume_url: data.resumeFileName || null,
      overall_score: overallScore,
      portfolio_score: pResult?.score ?? null,
      github_score: gResult?.score ?? null,
      resume_score: rResult?.score ?? null,
      detected_name: name,
      source_types: sourceTypes,
      full_results: { portfolio: pResult, github: gResult, resume: rResult },
    })

    const allStrengths = [
      ...(pResult?.strengths ?? []),
      ...(gResult?.strengths ?? []),
      ...(rResult?.strengths ?? []),
    ]
    const allWeaknesses = [
      ...(pResult?.weaknesses ?? []),
      ...(gResult?.weaknesses ?? []),
      ...(rResult?.weaknesses ?? []),
    ]
    const allRecommendations = [
      ...(pResult?.recommendations ?? []),
      ...(gResult?.recommendations ?? []),
      ...(rResult?.recommendations ?? []),
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
