import {
  formatResumeUploadError,
  getResumeUploadErrorPresentation,
} from '@/features/resume/utils/resume-upload-error'

describe('resume upload error presentation', () => {
  it('maps typed scanned-PDF failures to actionable OCR guidance', () => {
    const presentation = getResumeUploadErrorPresentation({
      code: 'PARTIALLY_SCANNED_PDF',
      message: 'This PDF mixes searchable pages with scanned/image-only pages.',
    })

    expect(presentation.code).toBe('PARTIALLY_SCANNED_PDF')
    expect(presentation.title).toMatch(/pages are not searchable/i)
    expect(presentation.explanation).toMatch(/silently omit/i)
    expect(presentation.action).toMatch(/OCR every page/i)
  })

  it('surfaces the confirmed refund separately during paid analysis failures', () => {
    const presentation = getResumeUploadErrorPresentation(
      {
        code: 'PASSWORD_PROTECTED_PDF',
        message: 'This PDF is password-protected. Your credit was refunded.',
      },
      { paidAnalysis: true }
    )

    expect(presentation.creditNotice).toBe('Your analysis credit was refunded.')
    expect(formatResumeUploadError(presentation)).toMatch(/credit was refunded/i)
  })

  it('keeps unknown server failures useful instead of inventing a typed diagnosis', () => {
    const presentation = getResumeUploadErrorPresentation({
      code: 'SOMETHING_NEW',
      message: 'Temporary parser service failure.',
    })

    expect(presentation.code).toBeUndefined()
    expect(presentation.title).toMatch(/could not be completed/i)
    expect(presentation.explanation).toBe('Temporary parser service failure.')
  })
})
