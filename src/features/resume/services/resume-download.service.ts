export const MAX_DOWNLOAD_BASE64_CHARS = 12_000_000
export const MAX_DOWNLOAD_PDF_BYTES = 8 * 1024 * 1024

export type VerifiedPdfDecodeResult =
  | { ok: true; pdf: Buffer }
  | { ok: false; status: 400 | 413; error: string }

export function sanitizeResumeDownloadFileName(value: string): string {
  const trimmed = value.trim().replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '')
  const base = trimmed || 'Resume_Improved_Resume.pdf'
  return base.toLowerCase().endsWith('.pdf') ? base.slice(0, 180) : `${base.slice(0, 176)}.pdf`
}

export function decodeVerifiedPdfBase64(value: string): VerifiedPdfDecodeResult {
  if (!value || value.length > MAX_DOWNLOAD_BASE64_CHARS) {
    return { ok: false, status: 413, error: 'The verified PDF payload is too large to download safely.' }
  }

  let pdf: Buffer
  try {
    pdf = Buffer.from(value, 'base64')
  } catch {
    return { ok: false, status: 400, error: 'The PDF payload is invalid.' }
  }

  if (pdf.length === 0 || pdf.length > MAX_DOWNLOAD_PDF_BYTES) {
    return { ok: false, status: 413, error: 'The verified PDF payload is outside the allowed size.' }
  }
  if (pdf.length < 5 || pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
    return { ok: false, status: 400, error: 'The payload is not a valid PDF document.' }
  }

  return { ok: true, pdf }
}
