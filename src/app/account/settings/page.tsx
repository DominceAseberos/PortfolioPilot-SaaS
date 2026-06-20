import { createClient } from '@/lib/supabase/server'
import { User, Shield, Bell } from 'lucide-react'
import { Button } from '@/components/common/Button'

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
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <div className="p-3 bg-muted/30 rounded-xl border border-border/50 font-medium">
                  {fullName}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <div className="p-3 bg-muted/30 rounded-xl border border-border/50 font-medium flex items-center justify-between">
                  {email}
                  <Shield className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" className="rounded-xl px-6 font-semibold shadow-sm">Update Profile</Button>
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Preferences
          </h2>
          <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground">Email Notifications</h3>
              <p className="text-sm text-muted-foreground mt-1">Receive updates about your portfolio scans and credit usage.</p>
            </div>
            <Button variant="secondary" className="rounded-full px-6 font-semibold shrink-0">Manage</Button>
          </div>
        </section>
      </div>
    </div>
  )
}
