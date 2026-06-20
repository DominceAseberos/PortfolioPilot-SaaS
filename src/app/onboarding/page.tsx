import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/constants'
import { OnboardingClient } from '@/components/auth/OnboardingClient'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.login)
  }

  // If they already have a username, they shouldn't be here
  if (user.user_metadata?.username) {
    redirect(ROUTES.dashboard)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <OnboardingClient email={user.email || ''} />
    </div>
  )
}
