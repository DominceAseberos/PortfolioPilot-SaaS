import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Subscription } from '@/types'
import { logger } from '@/lib/logger'

export class SubscriptionRepository {
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      logger.error('Failed to fetch subscription', { error: error.message })
      throw error
    }

    return data as Subscription
  }

  async createSubscription(data: {
    user_id: string
    stripe_customer_id: string
    stripe_subscription_id: string
    status: string
    plan: string
    current_period_end: string
  }): Promise<Subscription> {
    const supabase = createAdminClient()
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert(data)
      .select()
      .single()

    if (error) {
      logger.error('Failed to create subscription', { error: error.message })
      throw error
    }

    return subscription as Subscription
  }

  async updateSubscription(
    stripeSubscriptionId: string,
    updates: Partial<Subscription>
  ): Promise<Subscription | null> {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update subscription', { error: error.message })
      throw error
    }

    return data as Subscription
  }

  async upsertSubscription(data: {
    user_id: string
    stripe_customer_id: string
    stripe_subscription_id: string
    status: string
    plan: string
    current_period_end: string
  }): Promise<Subscription> {
    const supabase = createAdminClient()
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', data.stripe_subscription_id)
      .single()

    if (existing) {
      return this.updateSubscription(
        data.stripe_subscription_id,
        data as Partial<Subscription>
      ) as Promise<Subscription>
    }

    return this.createSubscription(data)
  }
}

export const subscriptionRepository = new SubscriptionRepository()
