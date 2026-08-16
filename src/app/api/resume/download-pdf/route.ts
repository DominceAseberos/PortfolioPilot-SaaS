import { NextResponse } from 'next/server'
import {
  decodeVerifiedPdfBase64,
  sanitizeResumeDownloadFileName,
} from '@/features/resume/services/resume-download.service'

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const fileNameValue = form.get('fileName')
    const pdfBase64Value = form.get('pdfBase64')

    if (typeof fileNameValue !== 'string' || typeof pdfBase64Value !== 'string') {
      return NextResponse.json({ error: 'A PDF payload and filename are required.' }, { status: 400 })
    }

    const decoded = decodeVerifiedPdfBase64(pdfBase64Value)
    if (!decoded.ok) {
      return NextResponse.json({ error: decoded.error }, { status: decoded.status })
    }

    const fileName = sanitizeResumeDownloadFileName(fileNameValue)
    return new Response(new Uint8Array(decoded.pdf), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${fileName}"`,
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Verified PDF download failed', error)
    return NextResponse.json({ error: 'Could not prepare the verified PDF download.' }, { status: 500 })
  }
}
