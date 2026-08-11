import type { StructuredTextItem } from 'unpdf'
import { groupTextItemsIntoLines } from '@/features/resume/services/resume-layout-geometry.service'
import { assignReadingOrder, detectColumns } from '@/features/resume/services/resume-reading-order.service'

function item(str: string, x: number, y: number, width: number, fontSize = 10): StructuredTextItem {
  return { str, x, y, width, height: fontSize, fontSize, fontFamily: 'Test', dir: 'ltr', hasEOL: false }
}

describe('layout-aware resume extraction geometry', () => {
  it('groups nearby items into a line and keeps word spacing', () => {
    const lines = groupTextItemsIntoLines([
      item('Staff', 40, 700, 25, 11), item('Nurse', 70, 700.4, 28, 11), item('Hospital', 40, 680, 40, 10),
    ])
    expect(lines).toHaveLength(2)
    expect(lines[0].text).toBe('Staff Nurse')
    expect(lines[1].text).toBe('Hospital')
  })

  it('detects visually larger headings without relying on vocabulary', () => {
    const lines = groupTextItemsIntoLines([
      item('CLINICAL COMPETENCIES', 40, 700, 150, 14), item('Phlebotomy', 40, 680, 55, 10), item('Wound Care', 40, 660, 55, 10),
    ])
    expect(lines[0].isHeading).toBe(true)
  })

  it('detects and orders a two-column resume by column instead of interleaving rows', () => {
    const lines = groupTextItemsIntoLines([
      item('Maria Santos', 40, 760, 130, 18),
      item('Skills', 40, 700, 55, 12), item('Phlebotomy', 40, 680, 70), item('Wound Care', 40, 660, 70), item('Patient Assessment', 40, 640, 90),
      item('Experience', 320, 700, 80, 12), item('Staff Nurse', 320, 680, 70), item('Example Hospital', 320, 660, 100), item('2024 - Present', 320, 640, 80),
    ])
    expect(detectColumns(lines).columnCount).toBe(2)
    const ordered = assignReadingOrder(lines)
    const text = ordered.lines.map((line) => line.text)
    expect(text.indexOf('Phlebotomy')).toBeLessThan(text.indexOf('Experience'))
    expect(ordered.columnCount).toBe(2)
  })
})
