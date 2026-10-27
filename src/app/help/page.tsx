import { Metadata } from 'next'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import Link from 'next/link'
import { ArrowLeft, HelpCircle, Mail, Shield, Coins, Sparkles, FileText, ArrowRight } from 'lucide-react'
import { Button } from '@/components/common/Button'

export const metadata: Metadata = {
  title: 'Help Center & FAQ - PortfolioPilot',
  description: 'Frequently asked questions, credit pack details, and support for PortfolioPilot.',
}

export default function HelpPage() {
  const faqs = [
    {
      q: 'How does PortfolioPilot evaluate candidates?',
      a: 'PortfolioPilot accepts any combination of a live portfolio URL, public GitHub profile, and PDF resume. Our pipeline fetches live DOM content, parses GitHub commit telemetry, extracts resume text, and cross-references all sources using fine-tuned LLMs to evaluate technical depth, ATS compatibility, and evidence alignment.',
    },
    {
      q: 'How do credit packs work?',
      a: 'PortfolioPilot operates on a pay-as-you-go model rather than a recurring monthly subscription. You buy credits only when you are preparing for job searches ($5 for 20 analyses or $12 for 60 analyses). Purchased credits never expire and can be used at your own pace.',
    },
    {
      q: 'What formats and file sizes are supported?',
      a: 'We accept standard PDF resume files up to 5MB, any public web portfolio URL, and public GitHub profile handles. No repository access or private permissions are required.',
    },
    {
      q: 'Is my resume or private code used to train public AI models?',
      a: 'No. We maintain strict enterprise privacy agreements. Your resume content and uploaded data are processed solely to generate your analysis report and are never sold or used to train public machine learning foundation models.',
    },
    {
      q: 'Can I delete my reviews or account?',
      a: 'Yes. You can delete individual review history records from your dashboard at any time, or request full account and data erasure via Account Settings > Delete Account.',
    },
    {
      q: 'How do I get in touch for support or billing questions?',
      a: 'You can reach out directly to our engineering team at support@zeist.org or daseberos@gmail.com. We respond to all inquiries within 24 hours.',
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
            <HelpCircle className="h-3.5 w-3.5" />
            Support & Knowledge Base
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-4">
            Help Center & Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Everything you need to know about analyzing your engineering profile, credit billing, and data security.
          </p>
        </div>

        {/* FAQs */}
        <div className="space-y-4 mb-12">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-6 rounded-2xl border border-border/70 bg-card/50 shadow-xs">
              <h3 className="text-base font-bold text-foreground mb-2 flex items-start gap-2.5">
                <span className="text-blue-500 font-mono text-sm shrink-0 mt-0.5">Q{idx + 1}.</span>
                {faq.q}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed pl-7">
                {faq.a}
              </p>
            </div>
          ))}
        </div>

        {/* Contact Support Box */}
        <div className="p-8 rounded-2xl border border-border/80 bg-muted/20 sm:flex items-center justify-between gap-6">
          <div className="mb-4 sm:mb-0">
            <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              Need additional help?
            </h3>
            <p className="text-sm text-muted-foreground">
              Have a billing question or custom feature request? Our team is available 7 days a week.
            </p>
          </div>
          <a href="mailto:daseberos@gmail.com" className="inline-block shrink-0">
            <Button size="lg" className="font-medium">
              Email Support <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </a>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
