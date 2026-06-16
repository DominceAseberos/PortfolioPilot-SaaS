import { NextResponse } from 'next/server'
import { resumeService } from '@/features/resume/services/resume.service'
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

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text using the newly public extractText method
    let text = ''
    try {
      text = await resumeService.extractText(buffer)
    } catch (e) {
      return NextResponse.json(
        { success: false, message: 'Could not extract text from the PDF. It may be a scanned image or protected.' },
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

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Validation route error:', error)
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred while verifying the document.' },
      { status: 500 }
    )
  }
}
