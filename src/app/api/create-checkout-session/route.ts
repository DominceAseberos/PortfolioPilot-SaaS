import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paymentService } from '@/features/payments/services/payment.service'
import { successResponse, errorResponse, unauthorizedResponse } from '@/utils/api'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const { priceId, credits = 20 } = body

    if (!process.env.STRIPE_SECRET_KEY) {
      return errorResponse('Stripe payments are currently in setup mode. Please configure STRIPE_SECRET_KEY in Vercel.', 400)
    }

    if (!priceId) {
      return errorResponse('Stripe Price ID is not set. Please configure NEXT_PUBLIC_STRIPE_PRO_PRICE_ID in Vercel.', 400)
    }

    const session = await paymentService.createCheckoutSession(user.id, priceId, user.email!, Number(credits) || 20)

    return successResponse({ url: session.url }, 'Checkout session created')
  } catch (error) {
    console.error('Checkout Session Error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to create checkout session'
    return errorResponse(msg, 500)
  }
}
