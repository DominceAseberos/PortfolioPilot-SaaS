import { Metadata } from 'next'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service - PortfolioPilot',
  description: 'Terms and conditions governing the use of PortfolioPilot.',
}

export default function TermsPage() {
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
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-3">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">
              Last updated: October 27, 2026
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using PortfolioPilot (&quot;the Service&quot;), hosted at devcompile.zeist.org, you agree to be bound by these Terms of Service. If you disagree with any portion of these terms, please refrain from using the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              PortfolioPilot provides analysis of professional developer portfolios, GitHub repositories, and resumes to deliver actionable feedback and recommendations for job readiness.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">3. Service Limitations and Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              The feedback provided is intended for guidance purposes only. PortfolioPilot makes no guarantee of employment, interview invitations, or specific salary offers resulting from our evaluations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">4. User Content & Ownership</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain all ownership rights to your resumes, portfolio links, and intellectual property submitted to PortfolioPilot. You grant us a limited license solely to process and analyze this data during your active usage.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">5. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to submit malicious software, automated scrapers, or third-party proprietary data without authorization, nor engage in any behavior intended to disrupt or overburden our systems.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">6. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the fullest extent permitted by applicable law, PortfolioPilot and its operators shall not be liable for any direct, indirect, incidental, or consequential damages arising from your access to or inability to use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">7. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For any questions regarding these Terms, please contact us at <span className="text-foreground font-medium">support@zeist.org</span>.
            </p>
          </section>
        </article>
      </main>

      <LandingFooter />
    </div>
  )
}
