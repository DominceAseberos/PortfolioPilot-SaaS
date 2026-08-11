import {
  createResumePdfExtractionError,
  getResumePdfExtractionErrorCode,
  isPdfBuffer,
} from '@/features/resume/services/resume-scanned-pdf.service'

describe('scanned PDF handling helpers', () => {
  it('recognizes the PDF file signature', () => {
    expect(isPdfBuffer(Buffer.from('%PDF-1.7\n'))).toBe(true)
    expect(isPdfBuffer(Buffer.from('not-pdf'))).toBe(false)
  })

  it('creates typed scanned-PDF errors that API routes can distinguish', () => {
    const error = createResumePdfExtractionError({
      code: 'SCANNED_PDF',
      pageCount: 2,
      detectedImageCount: 1,
    })

    expect(error.code).toBe('SCANNED_PDF')
    expect(error.pageCount).toBe(2)
    expect(error.detectedImageCount).toBe(1)
    expect(error.message).toMatch(/image-only|scanned/i)
    expect(getResumePdfExtractionErrorCode(error)).toBe('SCANNED_PDF')
  })

  it('keeps unrelated errors outside the typed extraction flow', () => {
    expect(getResumePdfExtractionErrorCode(new Error('other'))).toBeNull()
    expect(getResumePdfExtractionErrorCode(null)).toBeNull()
  })
})
