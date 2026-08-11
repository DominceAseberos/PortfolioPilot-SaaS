import type { ResumeLayoutLine } from './resume-layout-geometry.service'

export function detectColumns(lines: ResumeLayoutLine[]): { columnCount: number; splitX?: number } {
  if (lines.length < 6) return { columnCount: 1 }
  const minX = Math.min(...lines.map((line) => line.x))
  const maxX = Math.max(...lines.map((line) => line.x + line.width))
  const span = Math.max(1, maxX - minX)
  const candidates = lines.filter((line) => line.width < span * 0.72 && line.text.length > 1)
  if (candidates.length < 6) return { columnCount: 1 }

  let bestSplit: number | undefined
  let bestScore = 0
  for (let ratio = 0.35; ratio <= 0.65; ratio += 0.05) {
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

  return bestSplit !== undefined && bestScore >= 0.38
    ? { columnCount: 2, splitX: bestSplit }
    : { columnCount: 1 }
}

export function assignReadingOrder(lines: ResumeLayoutLine[]): { columnCount: number; lines: ResumeLayoutLine[] } {
  const detection = detectColumns(lines)
  const vertical = (a: ResumeLayoutLine, b: ResumeLayoutLine) => b.y - a.y || a.x - b.x
  if (detection.columnCount === 1 || detection.splitX == null) {
    return { columnCount: 1, lines: lines.map((line) => ({ ...line, column: 0 })).sort(vertical) }
  }

  const minX = Math.min(...lines.map((line) => line.x))
  const maxX = Math.max(...lines.map((line) => line.x + line.width))
  const span = Math.max(1, maxX - minX)
  const split = detection.splitX
  const full: ResumeLayoutLine[] = []
  const left: ResumeLayoutLine[] = []
  const right: ResumeLayoutLine[] = []

  for (const line of lines) {
    if ((line.x < split && line.x + line.width > split) || line.width >= span * 0.72) full.push({ ...line, column: 0 })
    else if (line.x + line.width * 0.5 < split) left.push({ ...line, column: 1 })
    else right.push({ ...line, column: 2 })
  }

  const contentTop = Math.max(...[...left, ...right].map((line) => line.y), -Infinity)
  const top = full.filter((line) => line.y >= contentTop)
  const rest = full.filter((line) => !top.includes(line))

  return {
    columnCount: 2,
    lines: [...top.sort(vertical), ...left.sort(vertical), ...right.sort(vertical), ...rest.sort(vertical)],
  }
}
