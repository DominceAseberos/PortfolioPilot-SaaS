import { Metadata } from 'next'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, GitBranch, ArrowRight, Sparkles, FolderGit2, Star, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/common/Button'

export const metadata: Metadata = {
  title: 'GitHub Best Practices for Developers - PortfolioPilot',
  description: 'How to optimize your GitHub profile, pin high-impact repositories, and write production-grade READMEs.',
}

export default function GitHubBestPracticesPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <GitBranch className="h-3.5 w-3.5" />
            Engineering Standards
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-4">
            GitHub Profile & Repository Best Practices
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Hiring engineers review your GitHub to evaluate your code hygiene, commit discipline, and technical architecture. Here is how to present your open-source work like a senior engineer.
          </p>
        </div>

        <div className="space-y-10">
          {/* Best Practice 1 */}
          <section className="p-6 rounded-2xl border border-border/70 bg-card/50 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-purple-600 text-white text-xs font-bold">1</span>
              <h2 className="text-xl font-bold">Pin 3 to 6 Full-Stack or Flagship Repositories</h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Your profile should act as an interactive showcase, not an uncategorized graveyard of cloned tutorials or abandoned prototypes.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Pin projects that demonstrate production architecture: auth, database schemas, edge deployment, or complex state management.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Archive or make private old beginner projects (like basic to-do lists or CSS clones) so recruiters immediately find your best work.</span>
              </li>
            </ul>
          </section>

          {/* Best Practice 2 */}
          <section className="p-6 rounded-2xl border border-border/70 bg-card/50 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-purple-600 text-white text-xs font-bold">2</span>
              <h2 className="text-xl font-bold">Write Production-Grade READMEs</h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Most engineering managers will not clone your repository locally without reading the README first. Every flagship repository should include:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 text-xs not-prose mb-4">
              <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                <h4 className="font-semibold text-foreground text-sm mb-1">Architecture & Stack</h4>
                <p className="text-muted-foreground">Specify the exact frameworks, runtime versions, databases, and third-party APIs used.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                <h4 className="font-semibold text-foreground text-sm mb-1">Live Demo Link</h4>
                <p className="text-muted-foreground">Provide a working production URL (e.g., Vercel, Cloudflare) with test credentials if auth is required.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                <h4 className="font-semibold text-foreground text-sm mb-1">Quickstart Commands</h4>
                <p className="text-muted-foreground">Document clear commands: <code className="bg-muted px-1 rounded">git clone</code>, <code className="bg-muted px-1 rounded">npm install</code>, and environment variable setup.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20">
                <h4 className="font-semibold text-foreground text-sm mb-1">Engineering Decisions</h4>
                <p className="text-muted-foreground">Explain <em>why</em> you made key trade-offs (e.g., choosing PostgreSQL over DynamoDB for ACID transactions).</p>
              </div>
            </div>
          </section>

          {/* Best Practice 3 */}
          <section className="p-6 rounded-2xl border border-border/70 bg-card/50 shadow-xs">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center h-7 w-7 rounded-full bg-purple-600 text-white text-xs font-bold">3</span>
              <h2 className="text-xl font-bold">Semantic Commits & Git Hygiene</h2>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Avoid giant monolithic commits like <code className="text-xs bg-muted px-1 rounded">&quot;fixed stuff&quot;</code> or <code className="text-xs bg-muted px-1 rounded">&quot;update&quot;</code>. Use conventional commit prefixes (<code className="text-xs bg-muted px-1 rounded">feat:</code>, <code className="text-xs bg-muted px-1 rounded">fix:</code>, <code className="text-xs bg-muted px-1 rounded">refactor:</code>, <code className="text-xs bg-muted px-1 rounded">perf:</code>).
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              PortfolioPilot scans repository commit logs to measure commit message consistency and project maintenance depth.
            </p>
          </section>

          {/* CTA Box */}
          <div className="p-8 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg text-center sm:text-left sm:flex items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold mb-1 flex items-center justify-center sm:justify-start gap-2">
                <Sparkles className="h-5 w-5" />
                Audit your GitHub profile
              </h3>
              <p className="text-purple-100 text-sm">
                Get automated recruiter ratings, repository coverage scores, and README feedback.
              </p>
            </div>
            <Link href="/dashboard/reviews" className="mt-4 sm:mt-0 shrink-0 inline-block">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50 font-semibold shadow-md">
                Audit GitHub <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
