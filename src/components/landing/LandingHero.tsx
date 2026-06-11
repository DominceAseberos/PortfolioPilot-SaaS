import Link from 'next/link'
import { Button } from '@/components/common/Button'
import { ROUTES } from '@/constants'
import { ArrowRight, BarChart3, FileSearch, GitBranch, Sparkles } from 'lucide-react'

export function LandingHero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,hsl(var(--primary)/0.1),transparent)]" />
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI-Powered Portfolio Analysis</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Get Recruiter-Style Feedback
            <span className="text-primary block">Before You Apply</span>
          </h1>
          <p className="text-muted-foreground mt-6 text-lg leading-relaxed">
            Upload your portfolio, GitHub profile, and resume. Receive structured evaluations 
            with actionable insights to improve your chances of landing your dream role.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href={ROUTES.register}>
              <Button size="lg" className="w-full sm:w-auto">
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href={ROUTES.login}>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground mt-4 text-sm">
            No credit card required. Free plan includes 1 review per month.
          </p>
        </div>

        {/* Feature Preview */}
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-6 text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
              <FileSearch className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Portfolio Review</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Get feedback on design, navigation, project quality, and more
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
              <GitBranch className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">GitHub Analysis</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Evaluate your profile, repos, activity, and code quality
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Resume Scoring</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Check ATS compatibility, keywords, and formatting
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
