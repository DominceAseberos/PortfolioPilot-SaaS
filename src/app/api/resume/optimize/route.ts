import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { optimizeResumeContentForLayout } from '@/features/ai/services/ai.service'
import { diffResumeSections } from '@/features/resume/services/resume-diff.service'
import { analyzeResumePreflight, type ResumeTemplateId } from '@/features/resume/services/resume-layout.service'
import type { ImprovedResumeData } from '@/types/resume'

const TEMPLATE_IDS = new Set<ResumeTemplateId>(['classic', 'modern', 'compact'])
const MAX_JSON_BYTES = 750_000
const MAX_SECTIONS = 60

function declaredBodyTooLarge(req: Request, limit: number): boolean {
  const raw = req.headers.get('content-length')
  if (!raw) return false
  const length = Number(raw)
  return Number.isFinite(length) && length > limit
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (declaredBodyTooLarge(req, MAX_JSON_BYTES)) {
      return NextResponse.json({ error: 'Resume data is too large to optimize safely' }, { status: 413 })
    }
    const rawBody = await req.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_JSON_BYTES) {
      return NextResponse.json({ error: 'Resume data is too large to optimize safely' }, { status: 413 })
    }

    let body: { data?: ImprovedResumeData; templateId?: ResumeTemplateId }
    try {
      const parsed: unknown = JSON.parse(rawBody)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid')
      body = parsed as { data?: ImprovedResumeData; templateId?: ResumeTemplateId }
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const data = body.data
    const templateId = body.templateId

    if (!data || !Array.isArray(data.sections)) {
      return NextResponse.json({ error: 'Missing resume data' }, { status: 400 })
    }
    if (data.sections.length > MAX_SECTIONS) {
      return NextResponse.json({ error: 'Resume contains too many sections to optimize safely' }, { status: 413 })
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
