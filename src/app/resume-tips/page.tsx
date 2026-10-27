import { Metadata } from 'next'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, FileText, Target } from 'lucide-react'
import { Button } from '@/components/common/Button'

export const metadata: Metadata = {
  title: 'Resume Tips & ATS Benchmarks - PortfolioPilot',
  description: 'Actionable developer resume guidelines, the Google XYZ formula, and ATS optimization tips.',
}

export default function ResumeTipsPage() {
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

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <FileText className="h-3.5 w-3.5" />
            Engineering Career Guide
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-4">
            Developer Resume Tips & ATS Optimization
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Technical recruiters spend an average of 6 to 10 seconds on an initial resume screen. Here is how to format your engineering experience so automated ATS parsers and senior hiring managers take notice.
          </p>
        </div>

        <div className="space-y-10">
          {/* Tip 1 */}
          <section className="p-6 rounded-2xl border border-border/70 bg-card/50 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
              <h2 className="text-xl font-bold">Use the Google XYZ Formula for Bullets</h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Avoid passive job descriptions like <em className="text-muted-foreground/80">&quot;Responsible for backend API maintenance.&quot;</em> Instead, structure every project or role bullet using Google&apos;s formula:
            </p>
            <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-sm font-mono mb-4 text-primary">
              Accomplished [X], as measured by [Y], by doing [Z]
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-muted-foreground">
                <div className="flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-400 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Weak Bullet
                </div>
                &quot;Built frontend features with React and integrated payment gateways.&quot;
              </div>
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-muted-foreground">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> High-Impact Bullet
                </div>
                &quot;Reduced checkout drop-off by 28% by rebuilding payment flow with React 19, Apple Pay, and webhook validation.&quot;
              </div>
            </div>
          </section>

          {/* Tip 2 */}
          <section className="p-6 rounded-2xl border border-border/70 bg-card/50 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-bold">2</span>
              <h2 className="text-xl font-bold">Single-Column ATS Compliance</h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Modern Applicant Tracking Systems (Workday, Greenhouse, Lever) parse PDFs top-to-bottom. Multi-column graphical templates with progress bars or floating text boxes often mangle your work history into unreadable text strings.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Keep text in a clean, single-column linear layout.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Never use graphical star ratings or skill percentage bars (e.g., &quot;90% React&quot;). ATS cannot parse graphical ratings.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Group technologies under clear headers: Languages, Frameworks, Cloud & Infrastructure, Databases.</span>
              </li>
            </ul>
          </section>

          {/* Tip 3 */}
          <section className="p-6 rounded-2xl border border-border/70 bg-card/50 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-600 text-white text-xs font-bold">3</span>
              <h2 className="text-xl font-bold">Cross-Verify with Public Evidence</h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              The fastest way to stand out is having verifiable public evidence for your skills. When you claim experience with PostgreSQL, Docker, or GraphQL, ensure your GitHub repositories or live portfolio projects back that up with real commits and running demos.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              PortfolioPilot&apos;s AI cross-references your uploaded resume against your GitHub activity to identify unverified claims before recruiters notice the gaps.
            </p>
          </section>

          {/* CTA Box */}
          <div className="p-8 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg text-center sm:text-left sm:flex items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold mb-1 flex items-center justify-center sm:justify-start gap-2">
                <Sparkles className="h-5 w-5" />
                Ready to test your resume?
              </h3>
              <p className="text-blue-100 text-sm">
                Get an instant AI review, ATS score breakdown, and rewrite suggestions in seconds.
              </p>
            </div>
            <Link href="/dashboard/reviews" className="mt-4 sm:mt-0 shrink-0 inline-block">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-md">
                Try Free Review <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
