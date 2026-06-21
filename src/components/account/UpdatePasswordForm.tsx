'use client'

import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Lock, Eye, EyeOff } from 'lucide-react'

export function UpdatePasswordForm() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = createClient()

  const handleUpdate = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsUpdating(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error

      toast.success('Password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: unknown) {
      console.error('Failed to update password:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to update password'
      toast.error(errorMsg)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <Lock className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Change Password</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Update the password you use to log in to your account.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">New Password</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 pr-10 bg-background rounded-xl border border-border/50 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Confirm New Password</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-background rounded-xl border border-border/50 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Confirm new password"
            />
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button 
          variant="outline" 
          className="rounded-xl px-6 font-semibold shadow-sm border-primary/20 hover:bg-primary/5"
          onClick={handleUpdate}
          isLoading={isUpdating}
          disabled={!newPassword || !confirmPassword}
        >
          Update Password
        </Button>
      </div>
    </div>
  )
}
