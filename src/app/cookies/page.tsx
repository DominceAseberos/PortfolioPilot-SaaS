import { Metadata } from 'next'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import Link from 'next/link'
import { ArrowLeft, Cookie, ShieldCheck, Database, Sliders } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Cookie Policy - PortfolioPilot',
  description: 'Learn how PortfolioPilot uses cookies and client-side storage to provide secure services.',
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <LandingHeader />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <article className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Cookie className="h-3.5 w-3.5" />
              Privacy & Transparency
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-3">Cookie Policy</h1>
            <p className="text-sm text-muted-foreground">
              Last updated: October 27, 2026
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">1. What Are Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small data files stored on your device when you browse websites. They are commonly used to remember your authentication session, maintain preferences, and keep platform operations secure. PortfolioPilot uses cookies strictly to enable platform functionality and protect user accounts.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">2. Cookies We Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              PortfolioPilot does <strong className="text-foreground">not</strong> use invasive third-party advertising cookies or cross-site tracking scripts. The cookies and client storage mechanisms we use fall into the following categories:
            </p>

            <div className="grid gap-4 mt-4 not-prose">
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex gap-4">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500 h-fit">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Essential Authentication Cookies</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Managed by Supabase Auth (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">sb-*-auth-token</code>). These encrypted HTTP-only session tokens verify your identity, keep you logged in between page refreshes, and guard against unauthorized requests.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex gap-4">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 h-fit">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Preference & State Storage</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Stored in local browser storage to remember your chosen theme (dark/light mode), interface view state, and temporary guest analysis tokens so your in-progress review isn&apos;t lost.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex gap-4">
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500 h-fit">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Payment & Security Tokens</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    When you purchase credits through our merchant checkout (Polar.sh), temporary fraud prevention and CSRF cookies are utilized by the payment processor to ensure transactions are cryptographically secure.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">3. Managing and Disabling Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Most web browsers allow you to manage cookie preferences through their browser settings. You can choose to block or delete cookies at any time. However, disabling essential authentication cookies will prevent you from signing in and accessing your personal analysis history.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">4. Inquiries</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions regarding our use of cookies, contact our engineering team directly at <span className="text-foreground font-medium">support@zeist.org</span>.
            </p>
          </section>
        </article>
      </main>

      <LandingFooter />
    </div>
  )
}
