import Stripe from 'stripe'
import { creditRepository } from '@/features/credits/repositories/credit.repository'
import { logger } from '@/lib/logger'

let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured.')
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return stripeInstance
}

export class PaymentService {
  async createCheckoutSession(userId: string, priceId: string, email: string, credits: number = 20) {
    const stripe = getStripe()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://devcompile.zeist.org')

    // Automatically inspect the price to support both one-time packs and recurring prices seamlessly
    const price = await stripe.prices.retrieve(priceId)
    const isRecurring = price.type === 'recurring'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer_email: email,
      mode: isRecurring ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/account/billing?success=true`,
      cancel_url: `${baseUrl}/account/billing?canceled=true`,
      metadata: { 
        user_id: userId,
        credits: String(credits),
      },
    }

    if (isRecurring) {
      sessionParams.subscription_data = {
        metadata: {
          user_id: userId,
          credits: String(credits),
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return session
  }

  async handleWebhookEvent(event: Stripe.Event) {
    logger.info('Processing Stripe webhook', { type: event.type })

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        if (!userId) {
          logger.error('No user_id found in session metadata')
          break
        }

        const creditsToAdd = Number(session.metadata?.credits) || 20
        
        await creditRepository.addCreditsAdmin(userId, creditsToAdd)
        logger.info(`Added ${creditsToAdd} credits to user ${userId}`)
        break
      }
    }
  }
}

export const paymentService = new PaymentService()
