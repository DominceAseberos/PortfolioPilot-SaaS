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

    const polarToken = process.env.POLAR_ACCESS_TOKEN
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY

    // 1. If Polar is configured, use Polar.sh Merchant of Record Checkout
    if (polarToken) {
      if (!priceId) {
        return errorResponse(
          'Polar Product ID is not set. Please configure NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID or NEXT_PUBLIC_POLAR_STARTER_PRODUCT_ID in Vercel.',
          400
        )
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'https://devcompile.zeist.org')

      const res = await fetch('https://api.polar.sh/v1/checkouts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${polarToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: priceId,
          customer_email: user.email,
          success_url: `${baseUrl}/account/billing?success=true`,
          metadata: {
            user_id: user.id,
            credits: String(credits),
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        console.error('Polar checkout error:', data)
        const errMsg =
          data.detail || data.message || 'Failed to create Polar checkout session'
        return errorResponse(errMsg, res.status || 400)
      }

      return successResponse({ url: data.url }, 'Polar checkout created')
    }

    // 2. Otherwise fallback to Stripe if STRIPE_SECRET_KEY is configured
    if (stripeSecretKey) {
      if (!priceId) {
        return errorResponse(
          'Stripe Price ID is not set. Please configure NEXT_PUBLIC_STRIPE_PRO_PRICE_ID in Vercel.',
          400
        )
      }

      const session = await paymentService.createCheckoutSession(
        user.id,
        priceId,
        user.email!,
        Number(credits) || 20
      )

      return successResponse({ url: session.url }, 'Checkout session created')
    }

    // 3. Neither configured
    return errorResponse(
      'Payment gateway is in setup mode. Please configure POLAR_ACCESS_TOKEN or STRIPE_SECRET_KEY in Vercel.',
      400
    )
  } catch (error) {
    console.error('Checkout Session Error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to create checkout session'
    return errorResponse(msg, 500)
  }
}
