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

  it('splits realistic column gutters without splitting normal word spacing', () => {
    const lines = groupTextItemsIntoLines([
      item('Skills', 40, 700, 30, 11),
      item('Tools', 75, 700, 25, 11),
      item('Experience', 130, 700, 60, 11),
      item('Staff', 195, 700, 25, 11),
      item('Nurse', 225, 700, 30, 11),
    ])
    expect(lines.map((line) => line.text)).toEqual(['Skills Tools', 'Experience Staff Nurse'])
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

  it('keeps same-baseline text from separate columns as separate logical lines', () => {
    const lines = groupTextItemsIntoLines([
      item('Skills', 40, 720, 55, 12), item('Experience', 210, 720, 80, 12),
      item('Process Documentation', 40, 700, 105), item('Operations Analyst', 210, 700, 95),
      item('Education', 40, 680, 65, 12), item('Projects', 210, 680, 60, 12),
      item('BS Business Administration', 40, 660, 152), item('Example Logistics', 210, 660, 90),
      item('Example University', 40, 640, 90), item('Operations Dashboard', 210, 640, 105),
      item('2019 - 2023', 40, 620, 65), item('2025', 210, 620, 28),
    ])

    const text = lines.map((line) => line.text)
    expect(detectColumns(lines).columnCount).toBe(2)
    expect(text).toContain('BS Business Administration')
    expect(text).toContain('Example Logistics')
    expect(text).not.toContain('BS Business Administration Example Logistics')
  })

  it('does not mistake a centered identity and right-aligned dates for two columns', () => {
    const lines = groupTextItemsIntoLines([
      item('Alex Rivera', 235, 760, 120, 20),
      item('Professional Summary', 40, 710, 130, 12),
      item('Operations analyst with cross-functional experience.', 40, 690, 300),
      item('Professional Experience', 40, 650, 150, 12),
      item('Operations Analyst', 40, 630, 95), item('2023 - Present', 500, 630, 60),
      item('Example Services Group', 40, 610, 115),
      item('Operations Assistant', 40, 570, 100), item('2021 - 2023', 505, 570, 55),
      item('Example Logistics', 40, 550, 90),
      item('Education', 40, 510, 70, 12),
      item('BS Business Administration', 40, 490, 135), item('2017 - 2021', 505, 490, 55),
    ])

    expect(detectColumns(lines).columnCount).toBe(1)
    expect(assignReadingOrder(lines).columnCount).toBe(1)
  })

  it('detects a sparse sidebar even when the main column is much denser', () => {
    const items: StructuredTextItem[] = [
      item('Core Skills', 40, 710, 70, 12), item('Professional Summary', 210, 710, 145, 12),
      item('Reporting', 40, 690, 55), item('Summary body line one', 210, 690, 160),
      item('Scheduling', 40, 670, 60), item('Summary body line two', 210, 670, 165),
      item('Education', 40, 630, 65, 12), item('Professional Experience', 210, 630, 155, 12),
      item('Example University', 40, 610, 90),
    ]
    for (let index = 0; index < 16; index++) {
      items.push(item(`Main-column detail ${index + 1}`, 210, 610 - index * 18, 150))
    }

    const lines = groupTextItemsIntoLines(items)
    expect(detectColumns(lines).columnCount).toBe(2)
    const ordered = assignReadingOrder(lines)
    expect(ordered.columnCount).toBe(2)
    expect(ordered.lines.some((line) => line.column === 1 && line.text === 'Education')).toBe(true)
    expect(ordered.lines.some((line) => line.column === 2 && line.text === 'Professional Experience')).toBe(true)
  })
})
