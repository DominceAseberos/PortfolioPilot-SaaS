import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { optimizeResumeContentForLayout } from '@/features/ai/services/ai.service'
import { diffResumeSections } from '@/features/resume/services/resume-diff.service'
import { analyzeResumePreflight, type ResumeTemplateId } from '@/features/resume/services/resume-layout.service'
import type { ImprovedResumeData } from '@/types/resume'

const TEMPLATE_IDS = new Set<ResumeTemplateId>(['classic', 'modern', 'compact'])

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const data = body?.data as ImprovedResumeData | undefined
    const templateId = body?.templateId as ResumeTemplateId | undefined

    if (!data || !Array.isArray(data.sections)) {
      return NextResponse.json({ error: 'Missing resume data' }, { status: 400 })
    }
    if (!templateId || !TEMPLATE_IDS.has(templateId)) {
      return NextResponse.json({ error: 'Invalid templateId' }, { status: 400 })
    }

    const before = analyzeResumePreflight(data, templateId)
    if (before.fit === 'comfortable') {
      return NextResponse.json({ sections: data.sections, operations: [], before, after: before })
    }

    const sections = await optimizeResumeContentForLayout(data.sections, templateId)
    const operations = diffResumeSections(data.sections, sections).filter((operation) => operation.action === 'rewrite' && !operation.protectedFact)
    const after = analyzeResumePreflight({ ...data, sections }, templateId)

    return NextResponse.json({ sections, operations, before, after })
  } catch (error) {
    console.error('Error in /api/resume/optimize:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
