import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'
import { logger } from '@/lib/logger'

export class AuthRepository {
  async getProfile(userId: string): Promise<Profile | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      logger.error('Failed to fetch profile', { error: error.message })
      throw error
    }

    return data as Profile
  }

  async createProfile(profile: Partial<Profile>): Promise<Profile | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('users')
      .insert(profile)
      .select()
      .single()

    if (error) {
      logger.error('Failed to create profile', { error: error.message })
      throw error
    }

    return data as Profile
  }

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update profile', { error: error.message })
      throw error
    }

    return data as Profile
  }
}

export const authRepository = new AuthRepository()
