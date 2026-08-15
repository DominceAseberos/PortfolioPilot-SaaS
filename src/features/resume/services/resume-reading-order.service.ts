import { detectColumns, type ResumeLayoutLine } from './resume-layout-geometry.service'

export { detectColumns }

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
