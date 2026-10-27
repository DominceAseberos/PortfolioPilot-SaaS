import { Metadata } from 'next'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { LandingFooter } from '@/components/landing/LandingFooter'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy - PortfolioPilot',
  description: 'Learn how PortfolioPilot collects, protects, and handles your data.',
}

export default function PrivacyPage() {
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
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl mb-3">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">
              Last updated: October 27, 2026
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              PortfolioPilot respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and AI-powered review services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Account Information:</strong> Name, email address, and authentication credentials through Supabase and OAuth providers.</li>
              <li><strong>Input Data:</strong> URLs to public developer portfolios, GitHub profiles, and uploaded resume files (PDF format).</li>
              <li><strong>Usage Data:</strong> Operational logs regarding feature interactions, performance metrics, and session duration.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">3. How We Process Data with AI</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our core services analyze technical resumes and portfolio presentations to provide recruiter-style feedback.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Your Input Data is transmitted to trusted AI infrastructure solely to generate candidate profile evaluations.</li>
              <li>We enforce data processing terms ensuring that user resumes and private code are not utilized to train public foundation models.</li>
              <li>We do not manually review your uploaded files unless explicitly requested by you for customer support.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">4. Data Retention and Deletion</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your resume data and generated evaluations only as long as needed to provide our services. You may delete individual reviews or request permanent account deletion through your account settings at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">5. Third-Party Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We never sell your personal information. We only share operational data with essential platform infrastructure partners, including Supabase (database & auth) and hosting services (Vercel).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">6. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We employ strict industry-standard security practices, including TLS encryption in transit and AES encryption at rest, to safeguard your account and data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">7. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions or data privacy inquiries, contact us at <span className="text-foreground font-medium">support@zeist.org</span>.
            </p>
          </section>
        </article>
      </main>

      <LandingFooter />
    </div>
  )
}
