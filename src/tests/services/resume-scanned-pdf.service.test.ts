import {
  classifyResumePdfParserError,
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

  it('classifies password and malformed parser failures deterministically', () => {
    expect(classifyResumePdfParserError({ name: 'PasswordException', message: 'No password given' })).toBe('PASSWORD_PROTECTED_PDF')
    expect(classifyResumePdfParserError({ name: 'InvalidPDFException', message: 'Invalid PDF structure' })).toBe('MALFORMED_PDF')
    expect(classifyResumePdfParserError(new Error('other'))).toBeNull()
  })

  it('creates typed partial-scan, password, and malformed errors', () => {
    const partial = createResumePdfExtractionError({ code: 'PARTIALLY_SCANNED_PDF', pageCount: 3, detectedImageCount: 1 })
    const password = createResumePdfExtractionError({ code: 'PASSWORD_PROTECTED_PDF', pageCount: 0, detectedImageCount: 0 })
    const malformed = createResumePdfExtractionError({ code: 'MALFORMED_PDF', pageCount: 0, detectedImageCount: 0 })

    expect(getResumePdfExtractionErrorCode(partial)).toBe('PARTIALLY_SCANNED_PDF')
    expect(partial.message).toMatch(/mixes|scanned/i)
    expect(getResumePdfExtractionErrorCode(password)).toBe('PASSWORD_PROTECTED_PDF')
    expect(password.message).toMatch(/password|encrypted/i)
    expect(getResumePdfExtractionErrorCode(malformed)).toBe('MALFORMED_PDF')
    expect(malformed.message).toMatch(/malformed|truncated/i)
  })

  it('keeps unrelated errors outside the typed extraction flow', () => {
    expect(getResumePdfExtractionErrorCode(new Error('other'))).toBeNull()
    expect(getResumePdfExtractionErrorCode(null)).toBeNull()
  })
})
