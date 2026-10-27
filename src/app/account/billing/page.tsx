import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROUTES } from '@/constants'
import { BillingPageClient } from '@/components/billing/BillingPageClient'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const supabase = await createClient()

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.login)
  }

  // Fetch user credits
  const { data: creditData } = await supabase
    .from('user_credits')
    .select('credits, has_claimed_free_credits')
    .eq('user_id', user.id)
    .single()

  const credits = creditData?.credits || 0
  const hasClaimed = creditData?.has_claimed_free_credits || false

  return (
    <BillingPageClient
      credits={credits}
      hasClaimed={hasClaimed}
      userEmail={user.email || ''}
      starterPriceId={
        process.env.NEXT_PUBLIC_POLAR_STARTER_PRODUCT_ID ||
        'd5baa306-c472-49c3-b17b-5ed8a2a52465'
      }
      proPriceId={
        process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID ||
        '55a7fe15-d3af-4627-86cd-972a40b2268a'
      }
    />
  )
}
