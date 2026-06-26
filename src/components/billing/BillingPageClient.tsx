'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { Coins, Zap, Activity, ShieldCheck, CreditCard, History } from 'lucide-react'

interface BillingPageClientProps {
  credits: number
  hasClaimed?: boolean
  userEmail: string
  proPriceId: string // We will repurpose this as the "Credit Pack" price ID
}

export function BillingPageClient({
  credits,
  hasClaimed = false,
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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Billing & Credits</h1>
        <p className="text-muted-foreground mt-1 text-lg">Manage your AI analysis credits and payment history.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
          <div className="text-sm text-red-800 dark:text-red-200 font-medium">
            {error}
          </div>
        </div>
      )}

      {/* Current Balance */}
      <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-8 shadow-sm relative overflow-hidden group">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-[80px] rounded-full group-hover:bg-primary/30 transition-colors pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <Coins className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Available Balance</p>
                {hasClaimed ? (
                   <Badge variant="secondary" className="text-[10px] py-0 h-5">Free Credits Claimed</Badge>
                ) : (
                   <Badge variant="outline" className="text-[10px] py-0 h-5 text-primary border-primary/30 bg-primary/5">Claim Available</Badge>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-5xl font-black tracking-tighter text-foreground">{credits}</h2>
                <span className="text-lg font-medium text-muted-foreground">Credits</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-xl border border-border/50">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <span>Securely tied to your account</span>
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Top Up Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Top Up Credits
          </h2>
          <div className="rounded-3xl border border-border/50 bg-card p-1 shadow-sm hover:shadow-md transition-all duration-300 relative group overflow-hidden">
             {/* Animated border glow */}
             <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
             
             <div className="bg-card rounded-[1.4rem] p-6 sm:p-8 h-full relative z-10 border border-transparent">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold">Standard Pack</h3>
                    <p className="text-muted-foreground mt-1 text-sm">Perfect for active developers.</p>
                  </div>
                  <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">Most Popular</Badge>
                </div>
                
                <div className="mb-8">
                  <span className="text-4xl font-black text-foreground">$10</span>
                  <span className="text-muted-foreground font-medium ml-1">/ one-time</span>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-sm">
                    <div className="p-1.5 rounded-full bg-primary/10 shrink-0"><Coins className="h-4 w-4 text-primary" /></div>
                    <span className="font-semibold text-foreground">100 Credits Total</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="p-1.5 rounded-full bg-muted shrink-0"><Zap className="h-4 w-4 text-muted-foreground" /></div>
                    <span>50 Deep UI Analyses (2 credits each)</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="p-1.5 rounded-full bg-muted shrink-0"><Activity className="h-4 w-4 text-muted-foreground" /></div>
                    <span>100 GitHub Analyses (1 credit each)</span>
                  </li>
                </ul>
                
                <Button
                  className="w-full rounded-xl h-12 text-md font-bold shadow-sm"
                  onClick={() => handleTopUp(proPriceId)}
                  isLoading={isLoading === 'checkout'}
                >
                  Purchase 100 Credits
                </Button>
             </div>
          </div>
        </section>

        {/* Transaction History Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" /> Transaction History
          </h2>
          <div className="rounded-3xl border border-dashed border-border bg-muted/10 p-12 flex flex-col items-center justify-center text-center h-[calc(100%-2rem)]">
            <div className="p-4 bg-muted/30 rounded-full mb-4">
              <History className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No transactions yet</h3>
            <p className="text-sm text-muted-foreground max-w-[200px]">Your credit purchases and invoices will appear here.</p>
          </div>
        </section>
      </div>
    </div>
  )
}

