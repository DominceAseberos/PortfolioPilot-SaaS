import {
  MAX_DOWNLOAD_BASE64_CHARS,
  decodeVerifiedPdfBase64,
  sanitizeResumeDownloadFileName,
} from '@/features/resume/services/resume-download.service'

describe('resume download service', () => {
  it('sanitizes user-facing PDF filenames', () => {
    expect(sanitizeResumeDownloadFileName('Alex Rivera Improved Resume.pdf')).toBe('Alex_Rivera_Improved_Resume.pdf')
    expect(sanitizeResumeDownloadFileName(' ../../resume ')).toBe('.._.._resume.pdf')
  })

  it('accepts bounded PDF bytes', () => {
    const pdf = Buffer.from('%PDF-1.4\n%%EOF', 'ascii')
    const result = decodeVerifiedPdfBase64(pdf.toString('base64'))

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.pdf).toEqual(pdf)
  })

  it('rejects non-PDF and oversized payloads', () => {
    expect(decodeVerifiedPdfBase64(Buffer.from('not pdf').toString('base64'))).toMatchObject({ ok: false, status: 400 })
    expect(decodeVerifiedPdfBase64('A'.repeat(MAX_DOWNLOAD_BASE64_CHARS + 1))).toMatchObject({ ok: false, status: 413 })
  })
})
