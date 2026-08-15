export type ResumePdfExtractionFailureCode =
  | 'SCANNED_PDF'
  | 'PARTIALLY_SCANNED_PDF'
  | 'UNREADABLE_PDF'
  | 'PASSWORD_PROTECTED_PDF'
  | 'MALFORMED_PDF'
  | 'PDF_TOO_MANY_PAGES'

export function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-'
}

export class ResumePdfExtractionError extends Error {
  constructor(
    public readonly code: ResumePdfExtractionFailureCode,
    message: string,
    public readonly pageCount?: number,
    public readonly detectedImageCount?: number
  ) {
    super(message)
    this.name = 'ResumePdfExtractionError'
  }
}

export interface ResumePdfScanInspection {
  code: ResumePdfExtractionFailureCode
  pageCount: number
  detectedImageCount: number
}

export function classifyResumePdfParserError(error: unknown): ResumePdfExtractionFailureCode | null {
  if (!error) return null
  const value = error as { name?: unknown; message?: unknown; code?: unknown }
  const name = typeof value.name === 'string' ? value.name : ''
  const message = typeof value.message === 'string' ? value.message : String(error)
  const combined = `${name} ${message}`.toLocaleLowerCase()

  if (
    combined.includes('passwordexception')
    || combined.includes('password required')
    || combined.includes('no password given')
    || combined.includes('incorrect password')
    || combined.includes('password-protected')
    || combined.includes('encrypted pdf')
  ) {
    return 'PASSWORD_PROTECTED_PDF'
  }

  if (
    combined.includes('invalidpdfexception')
    || combined.includes('invalid pdf')
    || combined.includes('malformed pdf')
    || combined.includes('pdf header')
    || combined.includes('startxref')
    || combined.includes('xref') && combined.includes('invalid')
    || combined.includes('unexpected end of file')
    || combined.includes('unexpected eof')
  ) {
    return 'MALFORMED_PDF'
  }

  return null
}

export async function inspectPdfWithoutReadableText(buffer: Buffer): Promise<ResumePdfScanInspection> {
  try {
    const { getDocumentProxy, getResolvedPDFJS } = await import('unpdf')
    const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    const pdf = await getDocumentProxy(uint8)
    const pdfjs = await getResolvedPDFJS()
    const ops = (pdfjs as unknown as { OPS?: Record<string, number> }).OPS ?? {}
    const imageOps = new Set(
      [
        'paintImageMaskXObject',
        'paintImageMaskXObjectGroup',
        'paintImageXObject',
        'paintInlineImageXObject',
        'paintInlineImageXObjectGroup',
        'paintImageXObjectRepeat',
        'paintImageMaskXObjectRepeat',
        'paintSolidColorImageMask',
      ]
        .map((name) => ops[name])
        .filter((value): value is number => typeof value === 'number')
    )
    const pageCount = pdf.numPages
    let detectedImageCount = 0

    try {
      for (let pageNumber = 1; pageNumber <= Math.min(pageCount, 2); pageNumber += 1) {
        const page = await pdf.getPage(pageNumber)
        const operatorList = await page.getOperatorList()
        detectedImageCount += operatorList.fnArray.filter((fn) => imageOps.has(fn)).length
        page.cleanup()
        if (detectedImageCount > 0) break
      }
    } finally {
      await pdf.destroy().catch(() => undefined)
    }

    return {
      code: detectedImageCount > 0 ? 'SCANNED_PDF' : 'UNREADABLE_PDF',
      pageCount,
      detectedImageCount,
    }
  } catch (error) {
    const classified = classifyResumePdfParserError(error)
    return { code: classified ?? 'UNREADABLE_PDF', pageCount: 0, detectedImageCount: 0 }
  }
}

export function createResumePdfExtractionError(inspection: ResumePdfScanInspection): ResumePdfExtractionError {
  if (inspection.code === 'SCANNED_PDF') {
    return new ResumePdfExtractionError(
      'SCANNED_PDF',
      'This PDF appears to be image-only or scanned. Export or OCR it as a searchable PDF before uploading.',
      inspection.pageCount,
      inspection.detectedImageCount
    )
  }

  if (inspection.code === 'PARTIALLY_SCANNED_PDF') {
    return new ResumePdfExtractionError(
      'PARTIALLY_SCANNED_PDF',
      'This PDF mixes searchable text pages with image-only/scanned pages. OCR every page or export a fully searchable PDF so no resume content is omitted.',
      inspection.pageCount,
      inspection.detectedImageCount
    )
  }

  if (inspection.code === 'PASSWORD_PROTECTED_PDF') {
    return new ResumePdfExtractionError(
      'PASSWORD_PROTECTED_PDF',
      'This PDF is password-protected or encrypted. Export an unlocked copy before uploading.',
      inspection.pageCount,
      inspection.detectedImageCount
    )
  }

  if (inspection.code === 'MALFORMED_PDF') {
    return new ResumePdfExtractionError(
      'MALFORMED_PDF',
      'This PDF is malformed or truncated and cannot be parsed safely. Export a fresh PDF and try again.',
      inspection.pageCount,
      inspection.detectedImageCount
    )
  }

  if (inspection.code === 'PDF_TOO_MANY_PAGES') {
    return new ResumePdfExtractionError(
      'PDF_TOO_MANY_PAGES',
      'This PDF contains too many pages for safe resume processing. Upload a resume/CV with 50 pages or fewer.',
      inspection.pageCount,
      inspection.detectedImageCount
    )
  }

  return new ResumePdfExtractionError(
    'UNREADABLE_PDF',
    'This PDF has no readable text layer and could not be safely parsed. Try exporting a fresh searchable PDF.',
    inspection.pageCount,
    inspection.detectedImageCount
  )
}

export function getResumePdfExtractionErrorCode(error: unknown): ResumePdfExtractionFailureCode | null {
  if (!error || typeof error !== 'object') return classifyResumePdfParserError(error)
  const code = (error as { code?: unknown }).code
  if (
    code === 'SCANNED_PDF'
    || code === 'PARTIALLY_SCANNED_PDF'
    || code === 'UNREADABLE_PDF'
    || code === 'PASSWORD_PROTECTED_PDF'
    || code === 'MALFORMED_PDF'
    || code === 'PDF_TOO_MANY_PAGES'
  ) {
    return code
  }
  return classifyResumePdfParserError(error)
}
