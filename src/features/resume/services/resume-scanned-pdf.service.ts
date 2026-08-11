export type ResumePdfExtractionFailureCode = 'SCANNED_PDF' | 'UNREADABLE_PDF'

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
  } catch {
    return { code: 'UNREADABLE_PDF', pageCount: 0, detectedImageCount: 0 }
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

  return new ResumePdfExtractionError(
    'UNREADABLE_PDF',
    'This PDF has no readable text layer and could not be safely parsed. Try exporting a fresh searchable PDF.',
    inspection.pageCount,
    inspection.detectedImageCount
  )
}

export function getResumePdfExtractionErrorCode(error: unknown): ResumePdfExtractionFailureCode | null {
  if (!error || typeof error !== 'object') return null
  const code = (error as { code?: unknown }).code
  return code === 'SCANNED_PDF' || code === 'UNREADABLE_PDF' ? code : null
}
