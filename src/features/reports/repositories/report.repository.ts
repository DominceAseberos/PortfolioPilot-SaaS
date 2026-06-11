import { createClient } from '@/lib/supabase/server'
import type { Report } from '@/types'
import { logger } from '@/lib/logger'

export class ReportRepository {
  async createReport(data: {
    review_id: string
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
  }): Promise<Report> {
    const supabase = await createClient()
    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        review_id: data.review_id,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        recommendations: data.recommendations,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create report', { error: error.message })
      throw error
    }

    return report as Report
  }

  async getReportByReviewId(reviewId: string): Promise<Report | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('review_id', reviewId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      logger.error('Failed to fetch report', { error: error.message })
      throw error
    }

    return data as Report
  }
}

export const reportRepository = new ReportRepository()
