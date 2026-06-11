import { type NextRequest } from 'next/server'
import { resumeService } from '@/features/resume/services/resume.service'
import { successResponse, errorResponse } from '@/utils/api'
import { FILE_UPLOAD } from '@/constants'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('resume') as File | null

    if (!file) {
      return errorResponse('No file uploaded', 400)
    }

    if (file.size > FILE_UPLOAD.maxFileSize) {
      return errorResponse('File size must be less than 5MB', 400)
    }

    if (file.type !== 'application/pdf') {
      return errorResponse('File must be a PDF', 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await resumeService.analyze(buffer, file.name)
    return successResponse(result, 'Resume analysis complete')
  } catch (error) {
    return errorResponse('Resume analysis failed', 500)
  }
}
