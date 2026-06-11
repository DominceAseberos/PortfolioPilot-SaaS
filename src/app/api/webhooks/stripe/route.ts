import { type NextRequest } from 'next/server'
import { subscriptionService } from '@/features/subscriptions/services/subscription.service'
import { errorResponse } from '@/utils/api'
import Stripe from 'stripe'
import { logger } from '@/lib/logger'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
  }
  return new Stripe(key)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return errorResponse('Missing stripe-signature header', 400)
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret || webhookSecret === 'whsec_placeholder') {
      logger.warn(
        'Stripe webhook secret not configured. Set STRIPE_WEBHOOK_SECRET in .env.local. ' +
          'Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe'
      )
      return errorResponse('Stripe webhook not configured', 501)
    }

    const stripe = getStripe()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    await subscriptionService.handleWebhookEvent(event)

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook error'
    logger.error('Stripe webhook error', { error: message })
    return errorResponse(message, 400)
  }
}
