import { Metadata } from 'next'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Clock, ArrowRight, Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Blog & Engineering Insights - PortfolioPilot',
  description: 'Articles, recruiter teardowns, and engineering insights on portfolios, resumes, and tech hiring.',
}

export default function BlogPage() {
  const articles = [
    {
      title: 'Why 80% of Developer Portfolios Fail the 30-Second Recruiter Screen',
      excerpt: 'Recruiters and engineering managers do not have time to browse 15 pages. Here is how to structure your projects, stack chips, and live URLs to capture attention instantly.',
      category: 'Portfolio Design',
      readTime: '4 min read',
      date: 'October 2026',
      href: '/#features',
    },
    {
      title: 'The Google XYZ Resume Formula: Turning Passive Tasks into Measurable Offers',
      excerpt: 'Moving beyond "worked with React and Docker" to quantifiable metrics that prove business impact and engineering ownership.',
      category: 'Resume Strategy',
      readTime: '6 min read',
      date: 'October 2026',
      href: '/resume-tips',
    },
    {
      title: 'GitHub as a Product Showroom: How Senior Engineers Curate Repositories',
      excerpt: 'Why pinning 4 production-grade repositories with live demos and architecture diagrams is 10x more valuable than a streak of trivial commits.',
      category: 'Open Source',
      readTime: '5 min read',
      date: 'October 2026',
      href: '/github-best-practices',
    },
    {
      title: 'Cross-Source AI Verification: The Evolution of Technical Candidate Screening',
      excerpt: 'How multi-modal verification bridges the disconnect between what developers put on their resume and what their GitHub commit history actually proves.',
      category: 'AI & Engineering',
      readTime: '7 min read',
      date: 'October 2026',
      href: '/help',
    },
  ]

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
            <BookOpen className="h-3.5 w-3.5" />
            Insights & Guides
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-4">
            PortfolioPilot Blog & Career Guides
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Data-backed breakdowns on tech hiring, ATS resume parsing, and portfolio optimization.
          </p>
        </div>

        <div className="space-y-6">
          {articles.map((article, idx) => (
            <Link 
              key={idx} 
              href={article.href}
              className="block p-6 rounded-2xl border border-border/70 bg-card/50 hover:bg-muted/30 hover:border-border transition-all duration-200 group shadow-xs"
            >
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                  {article.category}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {article.readTime}
                </span>
                <span>•</span>
                <span>{article.date}</span>
              </div>
              <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-2">
                {article.title}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {article.excerpt}
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                Read article <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
