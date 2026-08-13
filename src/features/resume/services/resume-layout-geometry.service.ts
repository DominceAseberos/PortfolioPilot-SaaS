import type { StructuredTextItem } from 'unpdf'

export interface ResumeLayoutLine {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
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

function splitHorizontalSegments(items: StructuredTextItem[]): StructuredTextItem[][] {
  const sorted = [...items].sort((a, b) => a.x - b.x)
  const segments: StructuredTextItem[][] = []
  let current: StructuredTextItem[] = []
  let previous: StructuredTextItem | undefined
  for (const item of sorted) {
    if (previous) {
      const gap = item.x - (previous.x + previous.width)
      const fontScale = Math.max(previous.fontSize || 10, item.fontSize || 10)
      if (gap > Math.max(24, fontScale * 2.4)) {
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
  return groups.flatMap((group) => splitHorizontalSegments(group.items).map((lineItems) => {
    const text = joinItems(lineItems)
    const x = Math.min(...lineItems.map((item) => item.x))
    const endX = Math.max(...lineItems.map((item) => item.x + item.width))
    const fontSize = Math.max(...lineItems.map((item) => item.fontSize || 0)) || bodySize
    const letters = text.replace(/[^A-Za-z]/g, '')
    const upperRatio = letters.length ? letters.replace(/[^A-Z]/g, '').length / letters.length : 0
    return {
      text,
      x,
      y: group.y,
      width: endX - x,
      height: Math.max(...lineItems.map((item) => item.height || fontSize)),
      fontSize,
      column: 0,
      isHeading: text.length <= 64 && (fontSize >= bodySize * 1.18 || (letters.length >= 3 && upperRatio >= 0.85)),
      isBullet: BULLET.test(text),
    }
  })).filter((line) => line.text).sort((a, b) => b.y - a.y || a.x - b.x)
}

export function formatLayoutLine(line: ResumeLayoutLine): string {
  const clean = line.text.replace(BULLET, '').trim()
  if (!clean) return ''
  if (line.isBullet) return `• ${clean}`
  if (line.isHeading) return `## ${clean}`
  return clean
}
