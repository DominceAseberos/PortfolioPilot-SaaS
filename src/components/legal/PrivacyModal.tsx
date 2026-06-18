import { X } from 'lucide-react'
import { useEffect } from 'react'

interface PrivacyModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative flex w-full max-w-2xl flex-col gap-4 rounded-xl border bg-background p-6 shadow-lg sm:max-h-[80vh]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>

        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 className="text-2xl font-bold tracking-tight">Privacy Policy</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-6 text-sm text-muted-foreground">
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-2">1. Introduction</h3>
            <p>
              PortfolioPilot respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and AI services.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground mb-2">2. Information We Collect</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Information:</strong> Name, email address, and authentication credentials.</li>
              <li><strong>Input Data:</strong> URLs to portfolios, GitHub profiles, and uploaded resume files (PDFs).</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our platform (e.g., features used, time spent).</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground mb-2">3. How We Process Data with AI</h3>
            <p>
              Our core service relies on Artificial Intelligence. Please note:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your Input Data is transmitted to our third-party AI providers (e.g., OpenAI) solely for the purpose of generating the requested analysis.</li>
              <li>We have Data Processing Agreements in place ensuring our AI providers do NOT use your Input Data to train their public foundational models.</li>
              <li>We do not manually review your Input Data unless legally required or specifically requested by you for support purposes.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground mb-2">4. Data Retention and Deletion</h3>
            <p>
              We retain your Input Data and generated reports only as long as necessary to provide you with the Service or as required by law. 
            </p>
            <p className="mt-2">
              You may request the deletion of your account and associated data at any time by contacting support. Upon request, all uploaded resumes and analysis history will be permanently deleted from our active databases within 30 days.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground mb-2">5. Third-Party Sharing</h3>
            <p>
              We do not sell your personal data. We may share information with:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Service Providers:</strong> Hosting partners (Vercel), database providers (Supabase), and AI API providers (OpenAI) who assist in operating our platform.</li>
              <li><strong>Legal Requirements:</strong> If required by law, subpoena, or other legal processes.</li>
            </ul>
          </section>
          
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-2">6. Security</h3>
            <p>
              We implement industry-standard security measures, including encryption in transit and at rest, to protect your personal information. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
