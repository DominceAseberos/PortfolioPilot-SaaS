import { createClient } from '@/lib/supabase/server'
import { User, Shield } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { UpdateProfileForm } from '@/components/account/UpdateProfileForm'
import { SettingsActions } from '@/components/account/SettingsActions'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const fullName = user.user_metadata?.full_name || 'Not set'
  const email = user.email

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences and profile details.</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Profile
          </h2>
          <UpdateProfileForm initialName={fullName} email={email || ''} />
        </section>

        <SettingsActions />
      </div>
    </div>
  )
}
