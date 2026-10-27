'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { Coins, Zap, Activity, ShieldCheck, CreditCard, History } from 'lucide-react'
import { CLAIM_BONUS_CREDITS } from '@/config/pricing'

interface BillingPageClientProps {
  credits: number
  hasClaimed?: boolean
  userEmail: string
  starterPriceId?: string
  proPriceId: string
}

export function BillingPageClient({
  credits,
  hasClaimed = false,
  userEmail,
  starterPriceId = '',
  proPriceId,
}: BillingPageClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<'checkout' | 'claim' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClaimCredits = async () => {
    setIsLoading('claim')
    setError(null)
    try {
      const res = await fetch('/api/user/claim-credits', {
        method: 'POST',
      })
      const json = await res.json()
      if (res.ok && json.success) {
        router.refresh()
      } else {
        setError(json.error || 'Failed to claim credits')
      }
    } catch {
      setError('Failed to connect to the server')
    } finally {
      setIsLoading(null)
    }
  }

  const handleTopUp = async (priceId: string, creditCount = 20) => {
    setIsLoading('checkout')
    setError(null)
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, email: userEmail, credits: creditCount }),
      })
      const json = await res.json()
      if (json.success && json.data?.url) {
        window.location.href = json.data.url
      } else {
        setError(json.message || 'Payment gateway is currently being configured. Please contact support or check back soon.')
      }
    } catch {
      setError('Unable to reach the payment service. Please try again later.')
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
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 mt-1">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-black tracking-tighter text-foreground">{credits}</h2>
                  <span className="text-lg font-medium text-muted-foreground">Credits</span>
                </div>
                {!hasClaimed && (
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={handleClaimCredits} 
                    isLoading={isLoading === 'claim'}
                    className="mb-1.5"
                  >
                    Claim {CLAIM_BONUS_CREDITS} Free Credits
                  </Button>
                )}
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
        <section className="space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Choose a Practical Credit Pack
            </h2>
            <span className="text-xs text-muted-foreground">Zero subscriptions • Pay as you go</span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Starter Pack ($5) */}
            <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:border-primary/40 hover:shadow-md transition-all">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">Starter Pack</h3>
                    <p className="text-xs text-muted-foreground mt-1">Perfect for job hunting & fast reviews</p>
                  </div>
                  <Badge variant="outline" className="border-border text-muted-foreground text-xs font-semibold">Entry</Badge>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-foreground">$5</span>
                    <span className="text-xs text-muted-foreground font-medium">/ one-time</span>
                  </div>
                  <p className="text-xs text-primary font-semibold mt-1">20 Credits Total (Never Expire)</p>
                </div>

                <ul className="space-y-3 mb-8 text-xs sm:text-sm text-muted-foreground">
                  <li className="flex items-center gap-2.5">
                    <Coins className="h-4 w-4 text-primary shrink-0" />
                    <span>~7 Complete multi-source scans</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Zap className="h-4 w-4 text-primary shrink-0" />
                    <span>AI Resume Builder & ATS PDF exports</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Activity className="h-4 w-4 text-primary shrink-0" />
                    <span>GitHub profile & code metrics</span>
                  </li>
                </ul>
              </div>

              <Button
                variant="outline"
                className="w-full rounded-xl h-11 font-bold border-border/80 hover:bg-muted"
                onClick={() => handleTopUp(starterPriceId || proPriceId, 20)}
                isLoading={isLoading === 'checkout'}
              >
                Purchase 20 Credits ($5)
              </Button>
            </div>

            {/* Pro Pack ($12) */}
            <div className="rounded-3xl border-2 border-primary/50 bg-gradient-to-b from-primary/5 via-card to-card p-6 sm:p-8 flex flex-col justify-between shadow-md relative group overflow-hidden">
              <div className="absolute top-0 right-0">
                <span className="bg-primary text-primary-foreground text-[10px] font-extrabold uppercase tracking-widest px-4 py-1 rounded-bl-xl shadow-xs">
                  Most Popular
                </span>
              </div>

              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">Pro Career Pack</h3>
                    <p className="text-xs text-muted-foreground mt-1">Full career prep & unlimited resume edits</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-foreground">$12</span>
                    <span className="text-xs text-muted-foreground font-medium">/ one-time</span>
                  </div>
                  <p className="text-xs text-primary font-semibold mt-1">60 Credits Total (Save 20%)</p>
                </div>

                <ul className="space-y-3 mb-8 text-xs sm:text-sm text-foreground/80">
                  <li className="flex items-center gap-2.5 font-medium">
                    <Coins className="h-4 w-4 text-primary shrink-0" />
                    <span>~20 Complete multi-source scans</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Zap className="h-4 w-4 text-primary shrink-0" />
                    <span>All ATS resume templates & live PDF preview</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Activity className="h-4 w-4 text-primary shrink-0" />
                    <span>Deep competency & mismatch audits</span>
                  </li>
                </ul>
              </div>

              <Button
                className="w-full rounded-xl h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/25"
                onClick={() => handleTopUp(proPriceId, 60)}
                isLoading={isLoading === 'checkout'}
              >
                Purchase 60 Credits ($12)
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

