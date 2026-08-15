import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyRenderedResumePdf, verifyUploadedRenderedResumePdf } from '@/features/resume/services/resume-pdf-verification.service'
import type { ResumeTemplateId } from '@/features/resume/services/resume-layout.service'
import type { ImprovedResumeData } from '@/types/resume'

const TEMPLATE_IDS = new Set<ResumeTemplateId>(['classic', 'modern', 'compact'])
const MAX_PDF_BYTES = 5 * 1024 * 1024
const MAX_REQUEST_BYTES = 8 * 1024 * 1024
const MAX_RESUME_DATA_CHARS = 1_000_000
const MAX_SECTIONS = 60

function declaredBodyTooLarge(req: Request, limit: number): boolean {
  const raw = req.headers.get('content-length')
  if (!raw) return false
  const length = Number(raw)
  return Number.isFinite(length) && length > limit
}

function isPdfSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === '%PDF-'
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (declaredBodyTooLarge(req, MAX_REQUEST_BYTES)) {
      return NextResponse.json({ error: 'Verification request is too large' }, { status: 413 })
    }

    const form = await req.formData()
    const pdf = form.get('pdf')
    const rawData = form.get('data')
    const templateId = form.get('templateId')

    if (!(pdf instanceof File)) {
      return NextResponse.json({ error: 'Missing rendered PDF' }, { status: 400 })
    }
    if (pdf.size <= 0 || pdf.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'Rendered PDF is empty or too large to verify' }, { status: 400 })
    }
    if (typeof rawData !== 'string') {
      return NextResponse.json({ error: 'Missing resume data' }, { status: 400 })
    }
    if (rawData.length > MAX_RESUME_DATA_CHARS) {
      return NextResponse.json({ error: 'Resume data is too large to verify safely' }, { status: 413 })
    }
    if (typeof templateId !== 'string' || (templateId !== 'uploaded' && !TEMPLATE_IDS.has(templateId as ResumeTemplateId))) {
      return NextResponse.json({ error: 'Invalid templateId' }, { status: 400 })
    }

    let data: ImprovedResumeData
    try {
      data = JSON.parse(rawData) as ImprovedResumeData
    } catch {
      return NextResponse.json({ error: 'Invalid resume data' }, { status: 400 })
    }

    if (!data || typeof data.name !== 'string' || !Array.isArray(data.sections)) {
      return NextResponse.json({ error: 'Invalid resume data' }, { status: 400 })
    }
    if (data.sections.length > MAX_SECTIONS) {
      return NextResponse.json({ error: 'Resume contains too many sections to verify safely' }, { status: 413 })
    }

    const bytes = new Uint8Array(await pdf.arrayBuffer())
    if (!isPdfSignature(bytes)) {
      return NextResponse.json({ error: 'Rendered file is not a valid PDF' }, { status: 400 })
    }

    if (templateId === 'uploaded') {
      if (data.templateContract?.source !== 'uploaded') {
        return NextResponse.json({ error: 'Uploaded template contract is missing' }, { status: 400 })
      }
      const verification = await verifyUploadedRenderedResumePdf(bytes, data, data.templateContract)
      return NextResponse.json(verification)
    }

    const verification = await verifyRenderedResumePdf(bytes, data, templateId as ResumeTemplateId)
    return NextResponse.json(verification)
  } catch (error) {
    console.error('Error in /api/resume/verify-pdf:', error)
    return NextResponse.json({ error: 'Could not verify rendered PDF' }, { status: 500 })
  }
}
