import { NextResponse } from 'next/server'
import { resumeService } from '@/features/resume/services/resume.service'
import { resumeLinkExtractionService } from '@/features/resume/services/resume-link-extraction.service'
import { getResumePdfExtractionErrorCode, isPdfBuffer } from '@/features/resume/services/resume-scanned-pdf.service'
import { FILE_UPLOAD } from '@/constants'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, message: 'File must be a PDF' },
        { status: 400 }
      )
    }

    if (file.size > FILE_UPLOAD.maxFileSize) {
      return NextResponse.json(
        { success: false, message: `File is too large. Maximum size for a resume is ${FILE_UPLOAD.maxFileSize / (1024 * 1024)}MB.` },
        { status: 400 }
      )
    }

    // Convert File to Buffer and verify the actual file signature before parsing.
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    if (!isPdfBuffer(buffer)) {
      return NextResponse.json(
        { success: false, message: 'The uploaded file is not a valid PDF.' },
        { status: 400 }
      )
    }

    let text = ''
    try {
      text = await resumeService.extractText(buffer)
    } catch (error) {
      const extractionCode = getResumePdfExtractionErrorCode(error)
      if (extractionCode === 'SCANNED_PDF') {
        return NextResponse.json(
          { success: false, code: extractionCode, message: 'This PDF appears to be scanned or image-only. Please OCR it or export it as a searchable PDF, then upload it again.' },
          { status: 422 }
        )
      }
      if (extractionCode === 'PARTIALLY_SCANNED_PDF') {
        return NextResponse.json(
          { success: false, code: extractionCode, message: 'This PDF mixes searchable pages with scanned/image-only pages. OCR every page or export a fully searchable PDF so no resume content is omitted.' },
          { status: 422 }
        )
      }
      if (extractionCode === 'PASSWORD_PROTECTED_PDF') {
        return NextResponse.json(
          { success: false, code: extractionCode, message: 'This PDF is password-protected or encrypted. Please export an unlocked copy and upload it again.' },
          { status: 422 }
        )
      }
      if (extractionCode === 'MALFORMED_PDF') {
        return NextResponse.json(
          { success: false, code: extractionCode, message: 'This PDF is malformed or truncated. Please export a fresh PDF and upload it again.' },
          { status: 400 }
        )
      }
      if (extractionCode === 'PDF_TOO_MANY_PAGES') {
        return NextResponse.json(
          { success: false, code: extractionCode, message: 'This PDF contains too many pages for safe resume processing. Please upload a resume/CV with 50 pages or fewer.' },
          { status: 400 }
        )
      }
      if (extractionCode === 'UNREADABLE_PDF') {
        return NextResponse.json(
          { success: false, code: extractionCode, message: 'This PDF has no readable text layer. Please export a fresh searchable PDF and try again.' },
          { status: 422 }
        )
      }
      return NextResponse.json(
        { success: false, message: 'Could not extract readable text from the PDF.' },
        { status: 400 }
      )
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'PDF contains no readable text.' },
        { status: 400 }
      )
    }

    // Hardcoded validation to determine if the text looks like a resume
    const validationResult = resumeService.validateResumeContent(text)

    if (!validationResult.isValid) {
      return NextResponse.json({
        success: false,
        message: validationResult.reason || 'Document does not appear to be a Resume/CV.'
      })
    }

    const detectedLinks = await resumeLinkExtractionService.validate(text)

    return NextResponse.json({ success: true, data: { detectedLinks } })

  } catch (error: unknown) {
    console.error('Validation route error:', error)
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred while verifying the document.' },
      { status: 500 }
    )
  }
}
