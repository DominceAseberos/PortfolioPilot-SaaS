import { createClient } from '@/lib/supabase/server'
import type { Review, ReviewWithReport } from '@/types'
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
  }): Promise<Review> {
    const supabase = await createClient()
    const { data: review, error } = await supabase
      .from('reviews')
      .insert(data)
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
}

export const reviewRepository = new ReviewRepository()
