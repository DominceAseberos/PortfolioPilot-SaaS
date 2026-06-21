'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/common/Button'
import { ROUTES } from '@/constants'
import { toast } from 'sonner'
import { Sparkles, User, Lock, Mail, Eye, EyeOff } from 'lucide-react'

export function OnboardingClient({ email, hasPassword }: { email: string, hasPassword?: boolean }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username.trim() || username.length < 3) {
      toast.error('Username must be at least 3 characters long')
      return
    }

    if (!hasPassword && (!password || password.length < 6)) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setIsLoading(true)
    try {
      // Check if username is taken (optional, but good practice if unique usernames are strictly enforced)
      // For this MVP, we'll just store it in user_metadata
      
      const updateData: any = { data: { username: username.trim().toLowerCase() } }
      if (!hasPassword && password) {
        updateData.password = password
      }

      const { error } = await supabase.auth.updateUser(updateData)

      if (error) throw error

      toast.success('Account setup complete!')
      router.push(ROUTES.dashboard)
      router.refresh()
    } catch (error: any) {
      console.error('Setup failed:', error)
      toast.error(error.message || 'Failed to complete setup. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-4 ring-1 ring-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.15)]">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Complete Setup</h1>
        <p className="text-muted-foreground mt-2">Almost there! {hasPassword ? 'Choose a username to access your dashboard.' : 'Set your username and an optional backup password to access your dashboard.'}</p>
      </div>

      <div className="rounded-3xl border border-border/50 bg-card p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] relative overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[60px] rounded-full group-hover:bg-primary/20 transition-colors pointer-events-none" />
        
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
              <input
                type="email"
                value={email}
                disabled
                className="w-full pl-11 pr-4 py-3 bg-muted/30 rounded-xl border border-border/50 text-muted-foreground font-medium cursor-not-allowed opacity-70"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Choose a Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="e.g. johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                required
                minLength={3}
              />
            </div>
          </div>

          {!hasPassword && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Set a Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-background rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                  required={!hasPassword}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground ml-1">You can use this password to log in with your email instead of Google next time.</p>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full h-12 text-md font-bold rounded-xl shadow-sm"
              isLoading={isLoading}
            >
              Save & Continue to Dashboard
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
