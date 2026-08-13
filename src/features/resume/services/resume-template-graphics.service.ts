import { getDocumentProxy, getResolvedPDFJS } from 'unpdf'
import type {
  ResumeTemplateBackgroundRegion,
  ResumeTemplateGraphicStyleContract,
} from '@/types/resume-template-contract'

type PdfProxy = Awaited<ReturnType<typeof getDocumentProxy>>

interface TextColorSample {
  color: string
  x: number
  y: number
  fontSize: number
  weight: number
}

interface RawBackground {
  color: string
  xMin: number
  yMin: number
  xMax: number
  yMax: number
  area: number
}

interface DividerSample {
  color: string
  width: number
  length: number
}

type Matrix = [number, number, number, number, number, number]
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

function multiplyMatrix(left: Matrix, right: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = left
  const [a2, b2, c2, d2, e2, f2] = right
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ]
}

function transformPoint(matrix: Matrix, x: number, y: number): [number, number] {
  return [
    matrix[0] * x + matrix[2] * y + matrix[4],
    matrix[1] * x + matrix[3] * y + matrix[5],
  ]
}

function transformBounds(matrix: Matrix, xMin: number, yMin: number, xMax: number, yMax: number) {
  const points = [
    transformPoint(matrix, xMin, yMin),
    transformPoint(matrix, xMax, yMin),
    transformPoint(matrix, xMax, yMax),
    transformPoint(matrix, xMin, yMax),
  ]
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  return {
    xMin: Math.min(...xs),
    yMin: Math.min(...ys),
    xMax: Math.max(...xs),
    yMax: Math.max(...ys),
  }
}

function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.trim().toLowerCase().match(/^#([0-9a-f]{6})$/)
  return match ? `#${match[1]}` : null
}

function glyphWeight(value: unknown): number {
  if (!Array.isArray(value)) return 0
  return value.reduce((total, item) => {
    if (typeof item === 'string') return total + item.length
    if (item && typeof item === 'object' && 'unicode' in item && typeof item.unicode === 'string') {
      return total + item.unicode.length
    }
    return total
  }, 0)
}

function dominantColor(samples: TextColorSample[]): string | undefined {
  const weights = new Map<string, number>()
  for (const sample of samples) {
    weights.set(sample.color, (weights.get(sample.color) ?? 0) + sample.weight)
  }
  return [...weights.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

function isAlmostWhite(color: string): boolean {
  const r = Number.parseInt(color.slice(1, 3), 16)
  const g = Number.parseInt(color.slice(3, 5), 16)
  const b = Number.parseInt(color.slice(5, 7), 16)
  return r >= 253 && g >= 253 && b >= 253
}

function containsPoint(region: RawBackground, sample: TextColorSample): boolean {
  return sample.x >= region.xMin
    && sample.x <= region.xMax
    && sample.y >= region.yMin
    && sample.y <= region.yMax
}

function toBackgroundRegion(
  background: RawBackground,
  pageWidth: number,
  pageHeight: number,
  textSamples: TextColorSample[]
): ResumeTemplateBackgroundRegion {
  const localText = textSamples.filter((sample) => containsPoint(background, sample))
  return {
    color: background.color,
    xRatio: background.xMin / pageWidth,
    topRatio: (pageHeight - background.yMax) / pageHeight,
    widthRatio: (background.xMax - background.xMin) / pageWidth,
    heightRatio: (background.yMax - background.yMin) / pageHeight,
    textColor: dominantColor(localText),
  }
}

function distinctBackgrounds(backgrounds: RawBackground[]): RawBackground[] {
  const output: RawBackground[] = []
  for (const background of backgrounds.sort((a, b) => b.area - a.area)) {
    const duplicate = output.some((existing) => (
      existing.color === background.color
      && Math.abs(existing.xMin - background.xMin) <= 2
      && Math.abs(existing.yMin - background.yMin) <= 2
      && Math.abs(existing.xMax - background.xMax) <= 2
      && Math.abs(existing.yMax - background.yMax) <= 2
    ))
    if (!duplicate) output.push(background)
    if (output.length >= 3) break
  }
  return output
}

export async function extractResumeGraphicStyle(
  pdf: PdfProxy,
  pageWidth: number,
  pageHeight: number
): Promise<ResumeTemplateGraphicStyleContract | undefined> {
  const PDFJS = await getResolvedPDFJS()
  const page = await pdf.getPage(1)
  const operatorList = await page.getOperatorList()

  let fillColor = '#000000'
  let strokeColor = '#000000'
  let lineWidth = 1
  let fontSize = 10
  let textX = 0
  let textY = 0
  let leading = 0
  let transform: Matrix = [...IDENTITY]
  const transformStack: Matrix[] = []

  const textSamples: TextColorSample[] = []
  const backgrounds: RawBackground[] = []
  const dividers: DividerSample[] = []
  const pageArea = Math.max(1, pageWidth * pageHeight)

  for (let index = 0; index < operatorList.fnArray.length; index++) {
    const fn = operatorList.fnArray[index]
    const args = operatorList.argsArray[index] as unknown[] | null

    if (fn === PDFJS.OPS.save) {
      transformStack.push([...transform])
      continue
    }
    if (fn === PDFJS.OPS.restore) {
      transform = transformStack.pop() ?? [...IDENTITY]
      continue
    }
    if (fn === PDFJS.OPS.transform && args && args.length >= 6 && args.slice(0, 6).every((value) => typeof value === 'number')) {
      transform = multiplyMatrix(transform, args.slice(0, 6) as Matrix)
      continue
    }
    if (fn === PDFJS.OPS.setFillRGBColor) {
      fillColor = normalizeHex(args?.[0]) ?? fillColor
      continue
    }
    if (fn === PDFJS.OPS.setStrokeRGBColor) {
      strokeColor = normalizeHex(args?.[0]) ?? strokeColor
      continue
    }
    if (fn === PDFJS.OPS.setLineWidth && typeof args?.[0] === 'number') {
      lineWidth = args[0]
      continue
    }
    if (fn === PDFJS.OPS.setFont && typeof args?.[1] === 'number') {
      fontSize = args[1]
      continue
    }
    if (fn === PDFJS.OPS.setLeading && typeof args?.[0] === 'number') {
      leading = args[0]
      continue
    }
    if (fn === PDFJS.OPS.moveText && typeof args?.[0] === 'number' && typeof args?.[1] === 'number') {
      textX = args[0]
      textY = args[1]
      continue
    }
    if (fn === PDFJS.OPS.setTextMatrix && typeof args?.[4] === 'number' && typeof args?.[5] === 'number') {
      textX = args[4]
      textY = args[5]
      continue
    }
    if (fn === PDFJS.OPS.nextLine) {
      textY -= leading
      continue
    }
    if (fn === PDFJS.OPS.showText) {
      const weight = glyphWeight(args?.[0])
      if (weight > 0) {
        const [x, transformedY] = transformPoint(transform, textX, textY)
        const y = transformedY < -2
          ? pageHeight + transformedY
          : transformedY > pageHeight + 2
            ? pageHeight - transformedY
            : transformedY
        textSamples.push({ color: fillColor, x, y, fontSize, weight })
      }
      continue
    }
    if (fn !== PDFJS.OPS.constructPath || !args) continue

    const paintOperator = args[0]
    const bbox = args[2] as ArrayLike<number> | undefined
    if (!bbox || bbox.length < 4) continue
    const rawXMin = Number(bbox[0])
    const rawYMin = Number(bbox[1])
    const rawXMax = Number(bbox[2])
    const rawYMax = Number(bbox[3])
    if (![rawXMin, rawYMin, rawXMax, rawYMax].every(Number.isFinite)) continue
    const { xMin, yMin, xMax, yMax } = transformBounds(transform, rawXMin, rawYMin, rawXMax, rawYMax)

    const width = Math.abs(xMax - xMin)
    const height = Math.abs(yMax - yMin)
    const isStroke = paintOperator === PDFJS.OPS.stroke
      || paintOperator === PDFJS.OPS.closeStroke
      || paintOperator === PDFJS.OPS.fillStroke
      || paintOperator === PDFJS.OPS.eoFillStroke
    const isFill = paintOperator === PDFJS.OPS.fill
      || paintOperator === PDFJS.OPS.eoFill
      || paintOperator === PDFJS.OPS.fillStroke
      || paintOperator === PDFJS.OPS.eoFillStroke

    if (isStroke && width >= pageWidth * 0.15 && height <= Math.max(3, lineWidth * 2)) {
      dividers.push({ color: strokeColor, width: lineWidth, length: width })
    }

    const area = width * height
    if (isFill && area >= pageArea * 0.04 && !isAlmostWhite(fillColor)) {
      backgrounds.push({ color: fillColor, xMin, yMin, xMax, yMax, area })
    }
  }

  if (textSamples.length === 0 && backgrounds.length === 0 && dividers.length === 0) return undefined

  const normalizedBackgrounds = distinctBackgrounds(backgrounds)
  const outsideBackgrounds = textSamples.filter((sample) => !normalizedBackgrounds.some((region) => containsPoint(region, sample)))
  const paletteSamples = outsideBackgrounds.length ? outsideBackgrounds : textSamples
  const bodyTextColor = dominantColor(paletteSamples) ?? '#000000'
  const accentTextColor = dominantColor(paletteSamples.filter((sample) => sample.color !== bodyTextColor))
  const divider = [...dividers].sort((a, b) => b.length - a.length)[0]

  return {
    bodyTextColor,
    accentTextColor,
    dividerColor: divider?.color,
    dividerWidth: divider?.width,
    backgroundRegions: normalizedBackgrounds.map((background) => toBackgroundRegion(background, pageWidth, pageHeight, textSamples)),
  }
}
