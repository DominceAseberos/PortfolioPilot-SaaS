import { X } from 'lucide-react'
import { useEffect } from 'react'

interface TermsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
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
          <h2 className="text-2xl font-bold tracking-tight">Terms of Service</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-6 text-sm text-muted-foreground">
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h3>
            <p>
              By accessing and using PortfolioPilot ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground mb-2">2. Description of Service</h3>
            <p>
              PortfolioPilot provides AI-powered analysis of professional portfolios, GitHub repositories, and resumes to deliver actionable feedback intended to help users improve their candidate profiles.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground mb-2">3. AI Service Limitations and "As-Is" Disclaimer</h3>
            <p>
              Our service utilizes advanced Artificial Intelligence (AI) models. You acknowledge that AI is an evolving technology and that:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Outputs are generated probabilistically and may occasionally contain inaccuracies, errors, or "hallucinations."</li>
              <li>The Service is provided on an "AS-IS" and "AS-AVAILABLE" basis without warranties of any kind.</li>
              <li>You are solely responsible for reviewing, verifying, and validating all AI-generated feedback before making decisions or applying for jobs based on such feedback.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground mb-2">4. User Content and AI Training</h3>
            <p>
              When you submit URLs, resumes, or other data ("User Content"), you grant us a license to process this data to provide the Service. 
            </p>
            <p className="mt-2 font-medium text-foreground">
              We do not claim ownership of your User Content. Furthermore, we explicitly state that we do not use your personal resumes or private repositories to train our foundational AI models without your explicit consent.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground mb-2">5. Acceptable Use</h3>
            <p>
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Upload malicious code, malware, or content designed to exploit our systems.</li>
              <li>Submit personal information of third parties without their consent.</li>
              <li>Attempt to reverse engineer the AI models or bypass security measures.</li>
            </ul>
          </section>
          
          <section>
            <h3 className="text-lg font-semibold text-foreground mb-2">6. Limitation of Liability</h3>
            <p>
              To the maximum extent permitted by law, PortfolioPilot and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or employment opportunities, resulting from your use of or inability to use the Service.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
