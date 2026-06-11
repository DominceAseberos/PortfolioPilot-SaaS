import { reviewRepository } from '@/features/reviews/repositories/review.repository'
import type { ScoreTrend, ReviewWithReport } from '@/types'

export class HistoryService {
  async getScoreTrends(userId: string): Promise<ScoreTrend[]> {
    const reviews = await reviewRepository.getReviewHistory(userId)
    return reviews.map((r) => ({
      date: r.created_at,
      overall: r.overall_score || 0,
      portfolio: r.portfolio_score || 0,
      github: r.github_score || 0,
      resume: r.resume_score || 0,
    }))
  }

  async compareReviews(userId: string, reviewId1: string, reviewId2: string): Promise<{
    review1: ReviewWithReport | null
    review2: ReviewWithReport | null
    differences: string[]
  }> {
    const [review1, review2] = await Promise.all([
      reviewRepository.getReviewById(reviewId1),
      reviewRepository.getReviewById(reviewId2),
    ])

    const differences: string[] = []
    if (review1 && review2 && review1.user_id === userId && review2.user_id === userId) {
      const scoreDiffs = [
        { label: 'Overall', before: review1.overall_score, after: review2.overall_score },
        { label: 'Portfolio', before: review1.portfolio_score, after: review2.portfolio_score },
        { label: 'GitHub', before: review1.github_score, after: review2.github_score },
        { label: 'Resume', before: review1.resume_score, after: review2.resume_score },
      ]
      scoreDiffs.forEach(({ label, before, after }) => {
        if (before !== null && after !== null && before !== after) {
          const change = after - before
          differences.push(`${label}: ${Math.round(before)} → ${Math.round(after)} (${change > 0 ? '+' : ''}${Math.round(change)})`)
        }
      })
    }

    return { review1, review2, differences }
  }

  async getImprovementPercentage(userId: string): Promise<number> {
    const reviews = await reviewRepository.getUserReviews(userId)
    const scores = reviews.map((r) => r.overall_score).filter((s): s is number => s !== null)
    if (scores.length < 4) return 0

    const mid = Math.floor(scores.length / 2)
    const firstHalf = scores.slice(0, mid)
    const secondHalf = scores.slice(mid)
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    return firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0
  }
}

export const historyService = new HistoryService()
