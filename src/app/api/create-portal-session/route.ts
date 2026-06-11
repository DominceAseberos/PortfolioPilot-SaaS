import { createClient } from '@/lib/supabase/server'
import { subscriptionService } from '@/features/subscriptions/services/subscription.service'
import { successResponse, errorResponse, unauthorizedResponse } from '@/utils/api'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return unauthorizedResponse()

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!subscription?.stripe_customer_id) {
      return errorResponse('No active subscription found', 400)
    }

    const session = await subscriptionService.createPortalSession(
      subscription.stripe_customer_id
    )

    return successResponse({ url: session.url }, 'Portal session created')
  } catch {
    return errorResponse('Failed to create portal session', 500)
  }
}
