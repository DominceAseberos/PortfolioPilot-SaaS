import { type NextRequest } from 'next/server'
import { subscriptionService } from '@/features/subscriptions/services/subscription.service'
import { errorResponse } from '@/utils/api'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return errorResponse('Missing stripe-signature header', 400)
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    await subscriptionService.handleWebhookEvent(event)

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook error'
    return errorResponse(message, 400)
  }
}
