'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/common/Button'
const ImprovedResumeModal = dynamic(() => import('@/components/dashboard/ImprovedResumeModal'), { ssr: false })
import { ResumeWorkflowErrorBoundary } from '@/components/dashboard/ResumeWorkflowErrorBoundary'
import type { ImprovedResumeData } from '@/types/resume'

const fixture: ImprovedResumeData = {
  name: 'Alex Rivera',
  email: 'alex@example.com',
  phone: '+1 555 0100',
  location: 'Austin, TX',
  linkedin: 'https://linkedin.com/in/alex-rivera',
  github: 'https://github.com/alex-rivera',
  website: 'https://alex.example.com',
  sections: [
    {
      title: 'Professional Summary',
      type: 'text',
      semanticType: 'summary',
      text: 'Product-minded software developer focused on reliable web applications and clear user experiences.',
      acceptsAIImprovements: true,
    },
    {
      title: 'Experience',
      type: 'entries',
      semanticType: 'experience',
      entries: Array.from({ length: 8 }, (_, index) => ({
        title: `Software Developer ${index + 1}`,
        subtitle: 'Example Labs',
        dates: '2020 – Present',
        bullets: [
          'Built and maintained resilient full-stack web workflows with typed APIs, automated validation, production diagnostics, accessibility safeguards, and cross-browser regression coverage.',
          'Improved PDF generation and export reliability through layout preflight checks, render verification, bounded fallbacks, performance instrumentation, and deterministic end-to-end testing.',
          'Collaborated across frontend and backend concerns while documenting architecture decisions, reducing repeated failure modes, and keeping user-facing workflows responsive under degraded services.',
        ],
      })),
      acceptsAIImprovements: true,
    },
    {
      title: 'Skills',
      type: 'list',
      semanticType: 'skills',
      items: ['TypeScript','React','Next.js','PostgreSQL','Node.js','REST APIs','Testing','Accessibility','Performance','Docker','Supabase','CI/CD','PDF rendering','Error handling','Observability','Git'],
      acceptsAIImprovements: true,
    },
  ],
}

export function ResumeE2EHarness() {
  const [open, setOpen] = useState(true)

  return (
    <main className="min-h-screen bg-background p-8">
      <h1 className="text-2xl font-bold">Resume E2E Harness</h1>
      {!open && (
        <Button className="mt-4" onClick={() => setOpen(true)}>
          Reopen Resume Editor
        </Button>
      )}
      {open && (
        <ResumeWorkflowErrorBoundary onClose={() => setOpen(false)}>
          <ImprovedResumeModal
            initialData={fixture}
            resumeFile={null}
            draftKey="e2e:resume-editor"
            onClose={() => setOpen(false)}
          />
        </ResumeWorkflowErrorBoundary>
      )}
    </main>
  )
}
