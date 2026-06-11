import Stripe from 'stripe'
import { subscriptionRepository } from '@/features/subscriptions/repositories/subscription.repository'
import { logger } from '@/lib/logger'

let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!)
  }
  return stripeInstance
}

export class SubscriptionService {
  async createCheckoutSession(userId: string, priceId: string, email: string) {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
      metadata: { user_id: userId },
      subscription_data: {
        metadata: { user_id: userId },
      },
    })

    return session
  }

  async createPortalSession(customerId: string) {
    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    })

    return session
  }

  async handleWebhookEvent(event: Stripe.Event) {
    const stripe = getStripe()
    logger.info('Processing Stripe webhook', { type: event.type })

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        if (!userId) break

        const retrievedSub = await stripe.subscriptions.retrieve(session.subscription as string) as unknown as { id: string; status: string; current_period_end: number; customer: string; metadata: Record<string, string> }
        await subscriptionRepository.upsertSubscription({
          user_id: userId,
          stripe_customer_id: retrievedSub.customer,
          stripe_subscription_id: retrievedSub.id,
          status: retrievedSub.status,
          plan: 'pro',
          current_period_end: new Date(retrievedSub.current_period_end * 1000).toISOString(),
        })
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.user_id
        if (!userId) break

        const subData = subscription as unknown as { id: string; status: string; current_period_end: number; customer: string; metadata: Record<string, string> }
        await subscriptionRepository.upsertSubscription({
          user_id: userId,
          stripe_customer_id: subData.customer,
          stripe_subscription_id: subData.id,
          status: subscription.status,
          plan: 'pro',
          current_period_end: new Date(subData.current_period_end * 1000).toISOString(),
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await subscriptionRepository.updateSubscription(subscription.id, {
          status: 'canceled',
          plan: 'free',
        })
        break
      }
    }
  }

  async getSubscriptionStatus(userId: string) {
    return subscriptionRepository.getUserSubscription(userId)
  }
}

export const subscriptionService = new SubscriptionService()
