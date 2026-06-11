import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/constants'
import { BillingPageClient } from '@/components/billing/BillingPageClient'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.login)
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const plan = subscription?.plan || 'free'
  const isPro = plan === 'pro'

  return (
    <BillingPageClient
      currentPlan={plan}
      isPro={isPro}
      subscription={subscription}
      userEmail={user.email || ''}
    />
  )
}
