'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { Coins, Zap, Activity } from 'lucide-react'

interface BillingPageClientProps {
  credits: number
  userEmail: string
  proPriceId: string // We will repurpose this as the "Credit Pack" price ID
}

export function BillingPageClient({
  credits,
  userEmail,
  proPriceId,
}: BillingPageClientProps) {
  const [isLoading, setIsLoading] = useState<'checkout' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTopUp = async (priceId: string) => {
    setIsLoading('checkout')
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Credits</h1>
        <p className="text-muted-foreground text-sm">Manage your AI analysis credits</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Current Balance */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Balance</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold tracking-tight">{credits}</h2>
                  <span className="text-sm font-medium text-muted-foreground">Credits</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold mt-8 mb-4">Top Up Credits</h2>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Standard Pack</CardTitle>
              <Badge variant="secondary">Most Popular</Badge>
            </div>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">$10</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-medium">100 Credits Total</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span>50 Deep UI Analyses (2 credits each)</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>100 GitHub/Summary Analyses (1 credit each)</span>
              </li>
            </ul>
            <Button
              className="w-full mt-4"
              onClick={() => handleTopUp(proPriceId)}
              isLoading={isLoading === 'checkout'}
            >
              Buy 100 Credits
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

