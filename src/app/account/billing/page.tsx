import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/constants'
import { BillingPageClient } from '@/components/billing/BillingPageClient'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.login)
  }

  // Fetch user credits
  const { data: creditData } = await supabase
    .from('user_credits')
    .select('credits')
    .eq('user_id', user.id)
    .single()

  const credits = creditData?.credits || 0

  return (
    <BillingPageClient
      credits={credits}
      userEmail={user.email || ''}
      proPriceId={process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || ''}
    />
  )
}
