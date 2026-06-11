import { createClient } from '@/lib/supabase/server'
import type { Review, ReviewWithReport, ReviewFullResults } from '@/types'
import { logger } from '@/lib/logger'

export class ReviewRepository {
  async createReview(data: {
    user_id: string
    portfolio_url?: string | null
    github_username?: string | null
    resume_url?: string | null
    overall_score?: number | null
    portfolio_score?: number | null
    github_score?: number | null
    resume_score?: number | null
    detected_name?: string | null
    source_types?: string[]
    full_results?: ReviewFullResults | null
  }): Promise<Review> {
    const supabase = await createClient()
    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        user_id: data.user_id,
        portfolio_url: data.portfolio_url ?? null,
        github_username: data.github_username ?? null,
        resume_url: data.resume_url ?? null,
        overall_score: data.overall_score ?? null,
        portfolio_score: data.portfolio_score ?? null,
        github_score: data.github_score ?? null,
        resume_score: data.resume_score ?? null,
        detected_name: data.detected_name ?? null,
        source_types: data.source_types ?? [],
        full_results: data.full_results ?? null,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create review', { error: error.message })
      throw error
    }

    return review as Review
  }

  async getReviewById(id: string): Promise<ReviewWithReport | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('reviews')
      .select('*, report:reports(*)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      logger.error('Failed to fetch review', { error: error.message })
      throw error
    }

    return data as ReviewWithReport
  }

  async getUserReviews(userId: string): Promise<Review[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch user reviews', { error: error.message })
      throw error
    }

    return (data || []) as Review[]
  }

  async getReviewHistory(userId: string): Promise<ReviewWithReport[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('reviews')
      .select('*, report:reports(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('Failed to fetch review history', { error: error.message })
      throw error
    }

    return (data || []) as ReviewWithReport[]
  }

  async getMonthlyReviewCount(userId: string): Promise<number> {
    const supabase = await createClient()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count, error } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString())

    if (error) {
      logger.error('Failed to count monthly reviews', { error: error.message })
      throw error
    }

    return count || 0
  }

  async getReviewsByIds(ids: string[]): Promise<Review[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Failed to fetch reviews by ids', { error: error.message })
      throw error
    }

    return (data || []) as Review[]
  }
}

export const reviewRepository = new ReviewRepository()
