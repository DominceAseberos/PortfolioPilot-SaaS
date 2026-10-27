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

    const polarToken =
      process.env.POLAR_ACCESS_TOKEN ||
      'polar_oat_Z3cL4r170aBfrnlfHVWWO5IeoK5o3rrSBarcC03s3Gz'
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY

    // 1. If Polar is configured, use Polar.sh Merchant of Record Checkout
    if (polarToken) {
      if (!priceId) {
        return errorResponse(
          'Product ID is required for checkout.',
          400
        )
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'https://devcompile.zeist.org')

      const res = await fetch('https://api.polar.sh/v1/checkouts/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${polarToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'PortfolioPilot/1.0',
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
          data.detail || data.message || 'Failed to create checkout session'
        return errorResponse(errMsg, res.status || 400)
      }

      return successResponse({ url: data.url }, 'Checkout created')
    }

    // 2. Otherwise fallback to Stripe if STRIPE_SECRET_KEY is configured
    if (stripeSecretKey) {
      if (!priceId) {
        return errorResponse('Stripe Price ID is required.', 400)
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
      'Payment gateway is in setup mode. Please configure POLAR_ACCESS_TOKEN in Vercel.',
      400
    )
  } catch (error) {
    console.error('Checkout Session Error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to create checkout session'
    return errorResponse(msg, 500)
  }
}
