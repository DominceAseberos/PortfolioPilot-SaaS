import { createClient } from '@/lib/supabase/server'
import { GitBranch, Globe, ShieldAlert, Link2 } from 'lucide-react'
import { Button } from '@/components/common/Button'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Check providers
  const providers = user.app_metadata?.providers || []
  const hasGithub = providers.includes('github')
  const hasGoogle = providers.includes('google')

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Connected Accounts</h1>
        <p className="text-muted-foreground mt-1">Connect your developer accounts to automatically sync your portfolio data.</p>
      </div>

      <div className="grid gap-4">
        {/* GitHub */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0">
              <GitBranch className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">GitHub</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Used to deep-scan your repositories and generate code feedback.</p>
            </div>
          </div>
          {hasGithub ? (
            <div className="flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-xl shrink-0">
              <Link2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-bold text-green-600 dark:text-green-400">Connected</span>
            </div>
          ) : (
            <Button variant="outline" className="rounded-xl font-bold shadow-sm shrink-0">Connect GitHub</Button>
          )}
        </div>

        {/* Google */}
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-500 shrink-0">
              <Globe className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Google</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Used for quick sign-in and identity verification.</p>
            </div>
          </div>
          {hasGoogle ? (
            <div className="flex items-center gap-2 bg-green-500/10 px-4 py-2 rounded-xl shrink-0">
              <Link2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-bold text-green-600 dark:text-green-400">Connected</span>
            </div>
          ) : (
            <Button variant="outline" className="rounded-xl font-bold shadow-sm shrink-0">Connect Google</Button>
          )}
        </div>
      </div>
      
      {!hasGithub && !hasGoogle && (
        <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Security Recommendation:</strong> Connect an identity provider to secure your account. Password-only accounts are less secure and harder to recover.
          </div>
        </div>
      )}
    </div>
  )
}
