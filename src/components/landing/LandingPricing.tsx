import Link from 'next/link'
import { Button } from '@/components/common/Button'
import { CREDIT_PACKS } from '@/constants'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { ScrollReveal } from '@/components/common/ScrollReveal'

export function LandingPricing() {
  return (
    <section id="pricing" className="relative py-32 overflow-hidden border-t">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal animation="fade-up" delay={100}>
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Pay As You Go Flexibility</h2>
            <p className="text-foreground/80 text-lg">
              Start with a free review, then simply top up credits as you need them. Zero subscriptions. Zero commitments.
            </p>
          </div>
        </ScrollReveal>

        <div className="mx-auto max-w-5xl grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Free Tier */}
          <ScrollReveal animation="fade-up" delay={200} className="h-full">
            <div className="relative rounded-3xl bg-card border border-border/50 shadow-sm p-8 md:p-12 flex flex-col h-full hover:border-foreground/20 hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group">
              <div className="mb-10">
                <h3 className="text-xl font-bold text-foreground mb-3">{CREDIT_PACKS.free.name}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl md:text-6xl font-black tracking-tight">${CREDIT_PACKS.free.price}</span>
                  <span className="text-muted-foreground font-medium text-lg">/free</span>
                </div>
              </div>
              
              <ul className="space-y-5 mb-12 flex-1">
                {CREDIT_PACKS.free.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <div className="mt-0.5 bg-slate-100 dark:bg-slate-800 rounded-full p-1 shrink-0 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                      <CheckCircle2 className="h-4 w-4 text-slate-500" />
                    </div>
                    <span className="text-foreground/80 font-medium leading-snug">{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/dashboard/reviews" className="w-full mt-auto">
                <Button variant="outline" size="lg" className="w-full rounded-xl border-border/50 hover:bg-slate-50 dark:hover:bg-slate-900 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold h-14 text-base group-hover:border-foreground/30">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </ScrollReveal>

          {/* Cyberpunk Clip-Path Pro Tier */}
          <ScrollReveal animation="scale-up" delay={400} className="h-full relative z-10 group/reveal">
            <div className="relative flex flex-col h-full lg:scale-105 transform hover:-translate-y-3 lg:hover:scale-[1.07] transition-all duration-500 z-10 group will-change-transform">
              
              {/* High-Performance Glow (Replaces expensive drop-shadow filter) */}
              <div className="absolute inset-4 bg-cyan-500/20 blur-2xl group-hover:bg-purple-500/30 transition-colors duration-500 rounded-3xl pointer-events-none" />
              
              {/* Outer Wrapper (Forms the glowing border via clip-path margin) */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-600 to-purple-600 opacity-80 group-hover:opacity-100 transition-opacity duration-500 will-change-opacity"
                   style={{ clipPath: "polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 40px 100%, 0 calc(100% - 40px))" }} />
                   
              {/* Inner Content Card (Removed backdrop-blur for performance) */}
              <div className="relative m-[2px] bg-background dark:bg-[#0f172a] p-8 md:p-12 flex flex-col h-full z-10"
                   style={{ clipPath: "polygon(0 0, calc(100% - 39px) 0, 100% 39px, 100% 100%, 39px 100%, 0 calc(100% - 39px))" }}>
                
                {/* Mesh Gradient Accents inside */}
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-cyan-500/10 blur-[40px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 will-change-opacity" />
                <div className="absolute bottom-10 -left-10 w-48 h-48 bg-purple-500/10 blur-[40px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 will-change-opacity" />

                {/* Futuristic Cyber Badge */}
                <div className="absolute top-0 right-0">
                  <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest px-8 py-2 shadow-lg"
                       style={{ clipPath: "polygon(15px 0, 100% 0, 100% 100%, 0 100%)" }}>
                    Most Popular
                  </div>
                </div>

                <div className="mb-10 relative pt-4">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-3 uppercase tracking-wider">{CREDIT_PACKS.starter.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl md:text-6xl font-black tracking-tight text-foreground drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">${CREDIT_PACKS.starter.price}</span>
                    <span className="text-muted-foreground font-medium text-lg">/100 credits</span>
                  </div>
                </div>
                
                <ul className="space-y-5 mb-12 flex-1 relative">
                  {CREDIT_PACKS.starter.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 group/item">
                      <div className="mt-0.5 shrink-0 group-hover/item:scale-125 transition-transform duration-300">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <span className="text-foreground/90 font-medium leading-snug group-hover/item:text-cyan-400 transition-colors">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/dashboard/reviews" className="w-full mt-auto relative group/btn">
                  <Button size="lg" className="w-full h-14 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-black uppercase tracking-widest text-base shadow-none border-none relative overflow-hidden rounded-none hover:scale-[1.03] active:scale-[0.98] transition-all duration-300"
                          style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)" }}>
                    {/* Cyber Sweep Shine Effect */}
                    <div className="absolute inset-0 -translate-x-[150%] group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
                    <span className="relative z-10 drop-shadow-md">Get Started Now ↗</span>
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  )
}
