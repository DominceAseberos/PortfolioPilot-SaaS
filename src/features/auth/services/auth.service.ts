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
    const { data: { user } } = await this.supabase.auth.getUser()
    const isAnonymous = user?.is_anonymous === true

    if (isAnonymous) {
      const { data, error } = await this.supabase.auth.updateUser({
        email,
        password,
        data: { full_name: fullName },
      })
      if (error) {
        logger.error('Anonymous upgrade failed', { error: error.message })
        throw error
      }
      return data
    }

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    if (error) {
      logger.error('Sign up failed', {
        ...error,
        message: error.message,
        name: error.name,
        status: (error as { status?: number })?.status,
      })
      throw error
    }
    return data
  }

  async signIn(email: string, password: string) {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (user?.is_anonymous) {
      document.cookie = `portfolio_guest_id=${user.id}; path=/; max-age=3600`
    }

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

  async signInWithGoogle(nextPath?: string) {
    const { data: { user } } = await this.supabase.auth.getUser()
    const isAnonymous = user?.is_anonymous === true
    const redirectUrl = `${window.location.origin}/api/auth/callback${nextPath ? `?next=${nextPath}` : ''}`

    if (isAnonymous) {
      document.cookie = `portfolio_guest_id=${user.id}; path=/; max-age=3600`
    }

    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    })
    if (error) {
      logger.error('Google sign in failed', { error: error.message })
      throw error
    }
    return data
  }

  async signInWithGithub(nextPath?: string) {
    const { data: { user } } = await this.supabase.auth.getUser()
    const isAnonymous = user?.is_anonymous === true
    const redirectUrl = `${window.location.origin}/api/auth/callback${nextPath ? `?next=${nextPath}` : ''}`

    if (isAnonymous) {
      document.cookie = `portfolio_guest_id=${user.id}; path=/; max-age=3600`
    }

    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectUrl,
      },
    })
    if (error) {
      logger.error('GitHub sign in failed', { error: error.message })
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
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser()
    if (error) {
      logger.error('Get user failed', { error: error.message })
      return null
    }
    return user
  }

  async getSession() {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession()
    if (error) {
      logger.error('Get session failed', { error: error.message })
      return null
    }
    return session
  }
}

export const authService = new AuthService()
