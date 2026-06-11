import { createClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

export class AuthService {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }

  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })
    if (error) {
      logger.error('Sign up failed', { error: error.message })
      throw error
    }
    return data
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      logger.error('Sign in failed', { error: error.message })
      throw error
    }
    return data
  }

  async signInWithGoogle() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    if (error) {
      logger.error('Google sign in failed', { error: error.message })
      throw error
    }
    return data
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut()
    if (error) {
      logger.error('Sign out failed', { error: error.message })
      throw error
    }
  }

  async resetPassword(email: string) {
    const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/forgot-password`,
    })
    if (error) {
      logger.error('Password reset failed', { error: error.message })
      throw error
    }
    return data
  }

  async getUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser()
    if (error) {
      logger.error('Get user failed', { error: error.message })
      return null
    }
    return user
  }

  async getSession() {
    const { data: { session }, error } = await this.supabase.auth.getSession()
    if (error) {
      logger.error('Get session failed', { error: error.message })
      return null
    }
    return session
  }
}

export const authService = new AuthService()
