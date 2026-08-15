import type { StructuredTextItem } from 'unpdf'

export interface ResumeLayoutLine {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontFamily?: string
  column: number
  isHeading: boolean
  isBullet: boolean
}

const BULLET = /^(?:[•●▪◦‣⁃*-]|[–—])\s*/

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function joinItems(items: StructuredTextItem[]): string {
  const sorted = [...items].sort((a, b) => a.x - b.x)
  let output = ''
  let previous: StructuredTextItem | undefined
  for (const item of sorted) {
    const text = item.str.trim()
    if (!text) continue
    if (previous) {
      const gap = item.x - (previous.x + previous.width)
      const charWidth = previous.str.length ? previous.width / previous.str.length : previous.fontSize * 0.45
      if (gap > Math.max(1.5, charWidth * 0.3) && !/^[,.;:!?%)\]}]/.test(text)) output += ' '
    }
    output += text
    previous = item
  }
  return output.replace(/\s+/g, ' ').trim()
}

function splitHorizontalSegments(items: StructuredTextItem[], columnSplit?: number): StructuredTextItem[][] {
  const sorted = [...items].sort((a, b) => a.x - b.x)
  const segments: StructuredTextItem[][] = []
  let current: StructuredTextItem[] = []
  let previous: StructuredTextItem | undefined
  for (const item of sorted) {
    if (previous) {
      const gap = item.x - (previous.x + previous.width)
      const fontScale = Math.max(previous.fontSize || 10, item.fontSize || 10)
      const crossesDetectedColumnBoundary = columnSplit != null
        && previous.x + previous.width <= columnSplit
        && item.x >= columnSplit
      if (crossesDetectedColumnBoundary || gap > Math.max(24, fontScale * 2.4)) {
        if (current.length) segments.push(current)
        current = []
      }
    }
    current.push(item)
    previous = item
  }
  if (current.length) segments.push(current)
  return segments
}

export function detectColumns(lines: ResumeLayoutLine[]): { columnCount: number; splitX?: number } {
  if (lines.length < 6) return { columnCount: 1 }
  const minX = Math.min(...lines.map((line) => line.x))
  const maxX = Math.max(...lines.map((line) => line.x + line.width))
  const span = Math.max(1, maxX - minX)
  const candidates = lines.filter((line) => line.width < span * 0.72 && line.text.length > 1)
  if (candidates.length < 6) return { columnCount: 1 }

  let bestSplit: number | undefined
  let bestScore = 0
  for (let ratio = 0.2; ratio <= 0.75; ratio += 0.05) {
    const split = minX + span * ratio
    const left = candidates.filter((line) => line.x + line.width * 0.5 < split)
    const right = candidates.filter((line) => line.x + line.width * 0.5 >= split)
    if (left.length < 3 || right.length < 3) continue
    const crossing = candidates.filter((line) => line.x < split && line.x + line.width > split).length
    const balance = Math.min(left.length, right.length) / Math.max(left.length, right.length)
    const score = balance - crossing / candidates.length
    if (score > bestScore) {
      bestScore = score
      bestSplit = split
    }
  }

  if (bestSplit === undefined) return { columnCount: 1 }

  const left = candidates.filter((line) => line.x + line.width * 0.5 < bestSplit)
  const right = candidates.filter((line) => line.x + line.width * 0.5 >= bestSplit)
  const leftHeadings = left.filter((line) => line.isHeading)
  const rightHeadings = right.filter((line) => line.isHeading)
  const minY = Math.min(...candidates.map((line) => line.y))
  const maxY = Math.max(...candidates.map((line) => line.y))
  const headingAlignmentTolerance = Math.max(30, (maxY - minY) * 0.1)
  const hasAlignedHeadings = leftHeadings.some((leftHeading) => (
    rightHeadings.some((rightHeading) => Math.abs(leftHeading.y - rightHeading.y) <= headingAlignmentTolerance)
  ))
  const hasStructuralHeadings = hasAlignedHeadings || (leftHeadings.length >= 2 && rightHeadings.length >= 2)
  if (hasStructuralHeadings) {
    const leftEdge = Math.max(...left.map((line) => line.x + line.width))
    const rightEdge = Math.min(...right.map((line) => line.x))
    const refinedSplit = rightEdge - leftEdge >= 4 ? (leftEdge + rightEdge) / 2 : bestSplit
    return { columnCount: 2, splitX: refinedSplit }
  }

  return { columnCount: 1 }
}

export function groupTextItemsIntoLines(items: StructuredTextItem[]): ResumeLayoutLine[] {
  const usable = items.filter((item) => item.str?.trim())
  if (!usable.length) return []
  const groups: { items: StructuredTextItem[]; y: number }[] = []
  for (const item of [...usable].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const tolerance = Math.max(1.5, item.fontSize * 0.3)
    const group = groups.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance)
    if (group) {
      group.items.push(item)
      group.y = group.items.reduce((sum, current) => sum + current.y, 0) / group.items.length
    } else groups.push({ items: [item], y: item.y })
  }
  const bodySize = median(usable.map((item) => item.fontSize).filter((size) => size > 0)) || 10

  const buildLines = (columnSplit?: number) => groups.flatMap((group) => splitHorizontalSegments(group.items, columnSplit).map((lineItems) => {
    const text = joinItems(lineItems)
    const x = Math.min(...lineItems.map((item) => item.x))
    const endX = Math.max(...lineItems.map((item) => item.x + item.width))
    const fontSize = Math.max(...lineItems.map((item) => item.fontSize || 0)) || bodySize
    const fontFamily = [...lineItems].sort((a, b) => (b.str?.length ?? 0) - (a.str?.length ?? 0))[0]?.fontFamily || 'Unknown'
    const letters = text.replace(/[^A-Za-z]/g, '')
    const upperRatio = letters.length ? letters.replace(/[^A-Z]/g, '').length / letters.length : 0
    return {
      text,
      x,
      y: group.y,
      width: endX - x,
      height: Math.max(...lineItems.map((item) => item.height || fontSize)),
      fontSize,
      fontFamily,
      column: 0,
      isHeading: text.length <= 64 && (fontSize >= bodySize * 1.18 || (letters.length >= 3 && upperRatio >= 0.85)),
      isBullet: BULLET.test(text),
    }
  })).filter((line) => line.text).sort((a, b) => b.y - a.y || a.x - b.x)

  const firstPass = buildLines()
  const detection = detectColumns(firstPass)
  if (detection.columnCount !== 2 || detection.splitX == null) return firstPass

  const itemMinX = Math.min(...usable.map((item) => item.x))
  const itemMaxX = Math.max(...usable.map((item) => item.x + item.width))
  const itemSpan = Math.max(1, itemMaxX - itemMinX)
  const narrowItems = usable.filter((item) => item.width < itemSpan * 0.72)
  const leftItems = narrowItems.filter((item) => item.x + item.width * 0.5 < detection.splitX!)
  const rightItems = narrowItems.filter((item) => item.x + item.width * 0.5 >= detection.splitX!)

  let regroupSplit = detection.splitX
  if (leftItems.length && rightItems.length) {
    const leftEdge = Math.max(...leftItems.map((item) => item.x + item.width))
    const rightEdge = Math.min(...rightItems.map((item) => item.x))
    if (rightEdge - leftEdge >= 4) regroupSplit = (leftEdge + rightEdge) / 2
  }

  return buildLines(regroupSplit)
}

export function formatLayoutLine(line: ResumeLayoutLine): string {
  const clean = line.text.replace(BULLET, '').trim()
  if (!clean) return ''
  if (line.isBullet) return `• ${clean}`
  if (line.isHeading) return `## ${clean}`
  return clean
}
