'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { PLANS } from '@/constants'
import { Check, Loader2 } from 'lucide-react'

interface Subscription {
  id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string
  plan: string
  current_period_end: string | null
}

interface BillingPageClientProps {
  currentPlan: string
  isPro: boolean
  subscription: Subscription | null
  userEmail: string
}

// In production, these would come from Stripe
const STRIPE_PRICES = {
  pro_monthly: 'price_pro_monthly',
  pro_yearly: 'price_pro_yearly',
}

export function BillingPageClient({ currentPlan, isPro, subscription, userEmail }: BillingPageClientProps) {
  const [isLoading, setIsLoading] = useState<'monthly' | 'yearly' | 'portal' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async (priceId: string, type: 'monthly' | 'yearly') => {
    setIsLoading(type)
    setError(null)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, email: userEmail }),
      })
      const json = await res.json()
      if (json.success && json.data?.url) {
        window.location.href = json.data.url
      } else {
        setError(json.message || 'Failed to start checkout')
      }
    } catch {
      setError('Failed to connect to payment provider')
    } finally {
      setIsLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    setIsLoading('portal')
    setError(null)
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
      })
      const json = await res.json()
      if (json.success && json.data?.url) {
        window.location.href = json.data.url
      } else {
        setError(json.message || 'Failed to open management portal')
      }
    } catch {
      setError('Failed to connect to payment provider')
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground text-sm">Manage your subscription and billing</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {isPro && subscription?.current_period_end && (
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Pro</span>
                  <Badge variant={subscription.status === 'active' ? 'success' : 'warning'}>
                    {subscription.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mt-1">
                  Your subscription is active until{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                isLoading={isLoading === 'portal'}
              >
                Manage Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className={isPro ? 'opacity-50' : ''}>
          <CardHeader>
            <CardTitle>{PLANS.free.name}</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">$0</span>
              <span className="text-muted-foreground">/month</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {PLANS.free.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
            {currentPlan === 'free' && (
              <Badge variant="secondary" className="w-full justify-center">Current Plan</Badge>
            )}
          </CardContent>
        </Card>

        <Card className={isPro ? '' : 'border-primary'}>
          <CardHeader>
            <CardTitle>{PLANS.pro.name}</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">$29</span>
              <span className="text-muted-foreground">/month</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {PLANS.pro.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
            {isPro ? (
              <Badge variant="success" className="w-full justify-center">Current Plan</Badge>
            ) : (
              <Button
                className="w-full"
                onClick={() => handleUpgrade(STRIPE_PRICES.pro_monthly, 'monthly')}
                isLoading={isLoading === 'monthly'}
              >
                {isLoading === 'monthly' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upgrade to Pro
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
