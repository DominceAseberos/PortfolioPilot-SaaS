import { type NextRequest } from 'next/server'
import { resumeService } from '@/features/resume/services/resume.service'
import { successResponse, errorResponse } from '@/utils/api'
import { FILE_UPLOAD } from '@/constants'
import { createClient } from '@/lib/supabase/server'
import { creditRepository } from '@/features/credits/repositories/credit.repository'
import { getResumePdfExtractionErrorCode, isPdfBuffer } from '@/features/resume/services/resume-scanned-pdf.service'

import { getAnalysisCost } from '@/config/pricing'

const CREDIT_COST = getAnalysisCost('resume')

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse('Unauthorized. Please log in to run AI analysis.', 401)
    }

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
    if (!isPdfBuffer(buffer)) {
      return errorResponse('The uploaded file is not a valid PDF.', 400)
    }

    const credits = await creditRepository.getUserCredits(user.id)
    if (credits < CREDIT_COST) {
      return errorResponse(`Insufficient credits. You need ${CREDIT_COST} credits to analyze a resume.`, 402)
    }

    const deducted = await creditRepository.deductCredits(user.id, CREDIT_COST)
    if (!deducted) {
      return errorResponse('Failed to deduct credits. Please try again.', 500)
    }

    try {
      const result = await resumeService.analyze(buffer, file.name)
      return successResponse(result, 'Resume analysis complete')
    } catch (error) {
      let refunded = false
      try {
        await creditRepository.addCreditsAdmin(user.id, CREDIT_COST)
        refunded = true
      } catch (refundError) {
        console.error('Failed to refund resume analysis credit:', refundError)
      }

      if (!refunded) {
        return errorResponse('Resume analysis failed and the automatic credit refund could not be confirmed. Please contact support before retrying.', 500)
      }

      const extractionCode = getResumePdfExtractionErrorCode(error)
      if (extractionCode === 'SCANNED_PDF') {
        return errorResponse('This PDF appears to be scanned or image-only. OCR it or export it as a searchable PDF, then try again. Your credit was refunded.', 422)
      }
      if (extractionCode === 'PARTIALLY_SCANNED_PDF') {
        return errorResponse('This PDF mixes searchable pages with scanned/image-only pages. OCR every page or export a fully searchable PDF so no resume content is omitted. Your credit was refunded.', 422)
      }
      if (extractionCode === 'PASSWORD_PROTECTED_PDF') {
        return errorResponse('This PDF is password-protected or encrypted. Export an unlocked copy and try again. Your credit was refunded.', 422)
      }
      if (extractionCode === 'MALFORMED_PDF') {
        return errorResponse('This PDF is malformed or truncated. Export a fresh PDF and try again. Your credit was refunded.', 400)
      }
      if (extractionCode === 'PDF_TOO_MANY_PAGES') {
        return errorResponse('This PDF contains too many pages for safe resume processing. Upload a resume/CV with 50 pages or fewer. Your credit was refunded.', 400)
      }
      if (extractionCode === 'UNREADABLE_PDF') {
        return errorResponse('This PDF has no readable text layer. Export a fresh searchable PDF and try again. Your credit was refunded.', 422)
      }
      if (error instanceof Error && error.message === 'NOT_A_RESUME') {
        return errorResponse('The uploaded document does not appear to be a Resume or CV. Your credit was refunded.', 400)
      }
      return errorResponse('Resume analysis failed. Your credit was refunded.', 500)
    }
  } catch {
    return errorResponse('Resume analysis failed', 500)
  }
}
