import Stripe from 'stripe'
import { creditRepository } from '@/features/credits/repositories/credit.repository'
import { logger } from '@/lib/logger'

let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!)
  }
  return stripeInstance
}

export class PaymentService {
  async createCheckoutSession(userId: string, priceId: string, email: string) {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      mode: 'payment', // Changed from subscription to payment for credit packs
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/billing?canceled=true`,
      metadata: { user_id: userId },
    })

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

        // We assume 100 credits for the standard pack for now
        // In a real app, you'd map the priceId or product to a specific credit amount
        const creditsToAdd = 100 
        
        await creditRepository.addCreditsAdmin(userId, creditsToAdd)
        logger.info(`Added ${creditsToAdd} credits to user ${userId}`)
        break
      }
    }
  }
}

export const paymentService = new PaymentService()

