import Link from 'next/link'
import { Button } from '@/components/common/Button'
import { CREDIT_PACKS } from '@/constants'
import { CheckCircle2, Zap, Sparkles } from 'lucide-react'
import { ScrollReveal } from '@/components/common/ScrollReveal'

export function LandingPricing() {
  return (
    <section id="pricing" className="relative py-28 overflow-hidden border-t">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal animation="fade-up" delay={100}>
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Simple, Transparent Pricing</h2>
            <p className="text-foreground/80 text-lg">
              Start with free credits, then top up anytime. Zero subscriptions. Zero expiration dates.
            </p>
          </div>
        </ScrollReveal>

        <div className="mx-auto max-w-6xl grid md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          
          {/* Free Tier */}
          <ScrollReveal animation="fade-up" delay={150} className="h-full">
            <div className="relative rounded-3xl bg-card border border-border/60 shadow-xs p-6 md:p-8 flex flex-col h-full hover:border-foreground/20 hover:shadow-lg transition-all duration-300 group">
              <div className="mb-6">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entry</span>
                <h3 className="text-2xl font-bold text-foreground mt-1 mb-2">{CREDIT_PACKS.free.name}</h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl md:text-5xl font-black tracking-tight">${CREDIT_PACKS.free.price}</span>
                  <span className="text-muted-foreground font-medium text-sm">/ 5 credits</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {CREDIT_PACKS.free.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <div className="mt-0.5 rounded-full p-1 bg-muted shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-foreground/80 leading-snug">{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/dashboard/reviews" className="w-full mt-auto">
                <Button variant="outline" size="lg" className="w-full rounded-xl border-border/70 hover:bg-muted font-bold h-12 text-sm">
                  Try Free
                </Button>
              </Link>
            </div>
          </ScrollReveal>

          {/* Starter Pack ($5) */}
          <ScrollReveal animation="fade-up" delay={250} className="h-full">
            <div className="relative rounded-3xl bg-card border border-primary/30 shadow-xs p-6 md:p-8 flex flex-col h-full hover:border-primary/60 hover:shadow-lg transition-all duration-300 group">
              <div className="mb-6">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Practical Value</span>
                <h3 className="text-2xl font-bold text-foreground mt-1 mb-2">{CREDIT_PACKS.starter.name}</h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl md:text-5xl font-black tracking-tight text-foreground">${CREDIT_PACKS.starter.price}</span>
                  <span className="text-muted-foreground font-medium text-sm">/ 20 credits</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {CREDIT_PACKS.starter.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <div className="mt-0.5 rounded-full p-1 bg-primary/10 shrink-0">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-foreground/90 font-medium leading-snug">{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/account/billing" className="w-full mt-auto">
                <Button variant="outline" size="lg" className="w-full rounded-xl border-primary/40 hover:bg-primary/5 text-primary font-bold h-12 text-sm">
                  Buy Starter Pack ($5)
                </Button>
              </Link>
            </div>
          </ScrollReveal>

          {/* Pro Pack ($12 - Most Popular) */}
          <ScrollReveal animation="scale-up" delay={350} className="h-full relative">
            <div className="relative rounded-3xl border-2 border-primary bg-gradient-to-b from-primary/5 via-card to-card p-6 md:p-8 flex flex-col h-full shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
              {/* Badge */}
              <div className="absolute top-0 right-0">
                <div className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl shadow-xs">
                  Most Popular
                </div>
              </div>

              <div className="mb-6 pt-2">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Best Deal
                </span>
                <h3 className="text-2xl font-bold text-foreground mt-1 mb-2">{CREDIT_PACKS.pro.name}</h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl md:text-5xl font-black tracking-tight text-primary">${CREDIT_PACKS.pro.price}</span>
                  <span className="text-muted-foreground font-medium text-sm">/ 60 credits</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {CREDIT_PACKS.pro.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <div className="mt-0.5 rounded-full p-1 bg-primary text-primary-foreground shrink-0">
                      <Zap className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-foreground font-semibold leading-snug">{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/account/billing" className="w-full mt-auto">
                <Button size="lg" className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 text-sm shadow-md shadow-primary/25">
                  Get Pro Pack ($12)
                </Button>
              </Link>
            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  )
}
