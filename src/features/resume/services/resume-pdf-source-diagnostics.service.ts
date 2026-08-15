import { getResolvedPDFJS, type StructuredTextItem } from 'unpdf'
import type { ResumeTemplateSourceDiagnostic } from '@/types/resume-template-contract'

interface RawTextItem {
  str?: string
  dir?: string
  transform?: number[]
}

interface PdfPageLike {
  rotate?: number
  getTextContent: () => Promise<{ items: unknown[] }>
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray?: Array<unknown[] | null> }>
  getViewport: (options: { scale: number }) => { width: number; height: number }
  cleanup?: () => void
}

interface PdfDocumentLike {
  numPages: number
  getPage: (pageNumber: number) => Promise<PdfPageLike>
}

export interface ResumePdfSourceDiagnosticsResult {
  diagnostics: ResumeTemplateSourceDiagnostic[]
  imageOnlyPages: number[]
  readablePages: number[]
  pageSizes: Array<{ pageNumber: number; width: number; height: number }>
  pageRotations: Array<{ pageNumber: number; rotation: number }>
  rotatedTextItems: number
  verticalTextItems: number
  replacementCharacterCount: number
  clippingPathCount: number
}

export const MAX_RESUME_PDF_PAGES = 50
const MIN_READABLE_PAGE_CHARS = 20
const PAGE_SIZE_TOLERANCE = 2
const ROTATION_TOLERANCE_DEGREES = 5

function normalizeAngle(value: number): number {
  let angle = value % 360
  if (angle > 180) angle -= 360
  if (angle <= -180) angle += 360
  return angle
}

function hasMaterialRotation(transform?: number[]): boolean {
  if (!transform || transform.length < 2) return false
  const [a, b] = transform
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  const angle = normalizeAngle(Math.atan2(b, a) * (180 / Math.PI))
  return Math.abs(angle) > ROTATION_TOLERANCE_DEGREES
}

function isExtremePage(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return true
  const longSide = Math.max(width, height)
  const shortSide = Math.min(width, height)
  const aspect = longSide / Math.max(shortSide, 1)
  return shortSide < 250 || longSide > 2000 || aspect > 3.5
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b)
}

/**
 * Inspects source-PDF features that affect safe uploaded-layout reproduction.
 * This is intentionally deterministic and does not modify or render the PDF.
 */
export async function inspectResumePdfSourceDiagnostics(
  pdf: PdfDocumentLike,
  structuredItems: StructuredTextItem[][] = []
): Promise<ResumePdfSourceDiagnosticsResult> {
  const diagnostics: ResumeTemplateSourceDiagnostic[] = []
  const pageSizes: ResumePdfSourceDiagnosticsResult['pageSizes'] = []
  const pageRotations: ResumePdfSourceDiagnosticsResult['pageRotations'] = []
  const imageOnlyPages: number[] = []
  const readablePages: number[] = []
  const rotatedPages: number[] = []
  const verticalPages: number[] = []
  const clippingPages: number[] = []
  const extremePages: number[] = []
  let rotatedTextItems = 0
  let verticalTextItems = 0
  let replacementCharacterCount = 0
  let clippingPathCount = 0

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
  const clipOps = new Set(
    ['clip', 'eoClip']
      .map((name) => ops[name])
      .filter((value): value is number => typeof value === 'number')
  )

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    try {
      const viewport = page.getViewport({ scale: 1 })
      pageSizes.push({ pageNumber, width: viewport.width, height: viewport.height })
      if (isExtremePage(viewport.width, viewport.height)) extremePages.push(pageNumber)

      const rotation = normalizeAngle(page.rotate ?? 0)
      pageRotations.push({ pageNumber, rotation })

      let rawItems: RawTextItem[] = []
      try {
        const textContent = await page.getTextContent()
        rawItems = textContent.items as RawTextItem[]
      } catch {
        // The structured text extraction may still have succeeded. Rotation
        // metadata is best-effort and must not invalidate readable content.
      }
      const pageStructuredItems = structuredItems[pageNumber - 1] ?? []
      const pageText = pageStructuredItems.map((item) => item.str).join('') || rawItems.map((item) => item.str ?? '').join('')
      const readableChars = pageText.replace(/\s/g, '').length
      if (readableChars >= MIN_READABLE_PAGE_CHARS) readablePages.push(pageNumber)

      let pageHasRotation = false
      let pageHasVerticalText = false
      for (const item of rawItems) {
        const text = item.str ?? ''
        replacementCharacterCount += (text.match(/\uFFFD/g) ?? []).length
        if (text.trim() && hasMaterialRotation(item.transform)) {
          rotatedTextItems += 1
          pageHasRotation = true
        }
        if (text.trim() && item.dir === 'ttb') {
          verticalTextItems += 1
          pageHasVerticalText = true
        }
      }
      if (pageHasRotation) rotatedPages.push(pageNumber)
      if (pageHasVerticalText) verticalPages.push(pageNumber)

      let imageCount = 0
      try {
        const operatorList = await page.getOperatorList()
        imageCount = operatorList.fnArray.filter((fn) => imageOps.has(fn)).length
        let pageClipCount = 0
        for (let index = 0; index < operatorList.fnArray.length; index += 1) {
          if (!clipOps.has(operatorList.fnArray[index])) continue
          let bbox: ArrayLike<number> | undefined
          for (let candidate = index - 1; candidate >= Math.max(0, index - 4); candidate -= 1) {
            if (operatorList.fnArray[candidate] !== ops.constructPath) continue
            bbox = operatorList.argsArray?.[candidate]?.[2] as ArrayLike<number> | undefined
            break
          }
          if (!bbox || bbox.length < 4) continue
          const width = Math.abs(Number(bbox[2]) - Number(bbox[0]))
          const height = Math.abs(Number(bbox[3]) - Number(bbox[1]))
          if (![width, height].every(Number.isFinite)) continue
          const areaRatio = (width * height) / Math.max(1, viewport.width * viewport.height)
          // Page/crop-boundary clips are normal PDF plumbing. Only interior
          // clipping regions can materially hide or mask resume layout.
          if (areaRatio >= 0.0005 && areaRatio < 0.9) pageClipCount += 1
        }
        if (pageClipCount > 0) {
          clippingPathCount += pageClipCount
          clippingPages.push(pageNumber)
        }
      } catch {
        // Operator inspection is diagnostic-only. A readable text layer should
        // still be accepted if a decorative operator list cannot be inspected.
      }
      if (readableChars < MIN_READABLE_PAGE_CHARS && imageCount > 0) imageOnlyPages.push(pageNumber)
    } finally {
      page.cleanup?.()
    }
  }

  if (pdf.numPages > MAX_RESUME_PDF_PAGES) {
    diagnostics.push({
      code: 'excessive-page-count',
      severity: 'blocking',
      detail: `The PDF contains ${pdf.numPages} pages. Uploaded-layout fidelity is limited to resume/CV documents with at most ${MAX_RESUME_PDF_PAGES} pages.`,
      count: pdf.numPages,
    })
  }

  const firstSize = pageSizes[0]
  const mixedSizePages = firstSize
    ? pageSizes
        .filter((page) => Math.abs(page.width - firstSize.width) > PAGE_SIZE_TOLERANCE || Math.abs(page.height - firstSize.height) > PAGE_SIZE_TOLERANCE)
        .map((page) => page.pageNumber)
    : []
  if (mixedSizePages.length > 0) {
    diagnostics.push({
      code: 'mixed-page-sizes',
      severity: 'blocking',
      detail: 'The source PDF uses different page dimensions across pages. The flowing uploaded-layout renderer uses one measured page geometry and cannot guarantee exact mixed-size reproduction.',
      pages: uniqueSorted([1, ...mixedSizePages]),
    })
  }

  const firstRotation = pageRotations[0]?.rotation ?? 0
  const mixedRotationPages = pageRotations.filter((page) => page.rotation !== firstRotation).map((page) => page.pageNumber)
  if (mixedRotationPages.length > 0) {
    diagnostics.push({
      code: 'mixed-page-rotations',
      severity: 'blocking',
      detail: 'The source PDF changes page rotation across pages, which cannot be reproduced safely by the current flowing uploaded-layout renderer.',
      pages: uniqueSorted([1, ...mixedRotationPages]),
    })
  }

  if (rotatedTextItems > 0) {
    diagnostics.push({
      code: 'rotated-text',
      severity: 'limited',
      detail: 'Rotated or transformed text was detected. Text content remains extractable, but exact rotated placement is not reproduced by the uploaded-layout renderer.',
      pages: uniqueSorted(rotatedPages),
      count: rotatedTextItems,
    })
  }

  if (verticalTextItems > 0) {
    diagnostics.push({
      code: 'vertical-text',
      severity: 'limited',
      detail: 'Vertical top-to-bottom text was detected. Content can be retained, but vertical typography is outside the exact uploaded-layout reproduction path.',
      pages: uniqueSorted(verticalPages),
      count: verticalTextItems,
    })
  }

  if (clippingPathCount > 0) {
    diagnostics.push({
      code: 'clipping-path',
      severity: 'limited',
      detail: 'Clipping paths were detected. Readable text is retained, but clipped or masked visual placement is not reproduced exactly by the uploaded-layout renderer.',
      pages: uniqueSorted(clippingPages),
      count: clippingPathCount,
    })
  }

  if (imageOnlyPages.length === pdf.numPages && pdf.numPages > 0) {
    diagnostics.push({
      code: 'image-only',
      severity: 'blocking',
      detail: 'Every inspected page is image-only or scanned and does not contain a reliable text layer.',
      pages: uniqueSorted(imageOnlyPages),
    })
  } else if (imageOnlyPages.length > 0) {
    diagnostics.push({
      code: 'partially-scanned',
      severity: 'blocking',
      detail: 'At least one page is image-only while other pages contain readable text. Continuing would silently omit content from the scanned page(s).',
      pages: uniqueSorted(imageOnlyPages),
    })
  }

  if (replacementCharacterCount >= 3) {
    diagnostics.push({
      code: 'text-decoding-anomaly',
      severity: 'limited',
      detail: 'The extracted text contains repeated Unicode replacement characters, indicating that some embedded text encoding may not decode cleanly.',
      count: replacementCharacterCount,
    })
  }

  if (extremePages.length > 0) {
    diagnostics.push({
      code: 'extreme-page-geometry',
      severity: 'blocking',
      detail: 'One or more pages use extreme dimensions/aspect ratios outside the verified resume-page geometry range.',
      pages: uniqueSorted(extremePages),
    })
  }

  return {
    diagnostics,
    imageOnlyPages: uniqueSorted(imageOnlyPages),
    readablePages: uniqueSorted(readablePages),
    pageSizes,
    pageRotations,
    rotatedTextItems,
    verticalTextItems,
    replacementCharacterCount,
    clippingPathCount,
  }
}
