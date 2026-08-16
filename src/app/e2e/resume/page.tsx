import { notFound } from 'next/navigation'
import { ResumeE2EHarness } from '@/components/e2e/ResumeE2EHarness'

export const dynamic = 'force-dynamic'

export default function ResumeE2EPage() {
  if (process.env.NEXT_PUBLIC_E2E_TEST_MODE !== '1' || process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <ResumeE2EHarness />
}
