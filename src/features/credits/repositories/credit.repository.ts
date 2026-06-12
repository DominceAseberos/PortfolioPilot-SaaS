import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export class CreditRepository {
  async getUserCredits(userId: string): Promise<number> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return 0 // No row means 0 credits
      throw error
    }
    return data.credits
  }

  async deductCredits(userId: string, amount: number): Promise<boolean> {
    const supabase = await createClient()
    const { error } = await supabase.rpc('deduct_credits', { p_user_id: userId, p_amount: amount })
    
    if (error) {
      logger.warn('Failed to deduct credits (likely insufficient)', { error: error.message, userId })
      return false
    }
    return true
  }

  async addCreditsAdmin(userId: string, amount: number): Promise<void> {
    const supabase = createAdminClient()
    const { error } = await supabase.rpc('add_credits', { p_user_id: userId, p_amount: amount })
    
    if (error) {
      logger.error('Failed to add credits via admin', { error: error.message, userId })
      throw error
    }
  }
}

export const creditRepository = new CreditRepository()
