import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { jsPDF } from 'jspdf'
import type { ImprovedResumeData } from '../../types/resume'
import { runSanitizedFixtureBenchmark } from './sanitized-resume-fixture-runner'

process.env.PDF_REGRESSION_TEST = '1'

async function main() {
  const root = mkdtempSync(join(tmpdir(), 'portfoliopilot-sanitized-fixture-'))
  try {
    const data: ImprovedResumeData = {
      name: 'Fixture Candidate',
      email: 'fixture@example.test',
      phone: '',
      location: 'Sample City',
      linkedin: '',
      github: '',
      website: '',
      sections: [
        {
          title: 'Professional Summary',
          type: 'text',
          semanticType: 'summary',
          classificationConfidence: 1,
          text: 'Operations coordinator experienced in scheduling, documentation, reporting, and process improvement.',
          acceptsAIImprovements: true,
        },
        {
          title: 'Professional Experience',
          type: 'entries',
          semanticType: 'experience',
          classificationConfidence: 1,
          entries: [{
            title: 'Operations Coordinator',
            subtitle: 'Sample Services Company',
            dates: '2023 - Present',
            bullets: [
              'Coordinated daily schedules and maintained accurate service documentation.',
              'Prepared weekly reports and followed up on operational exceptions.',
            ],
          }],
          acceptsAIImprovements: true,
        },
        {
          title: 'Core Skills',
          type: 'list',
          semanticType: 'skills',
          classificationConfidence: 1,
          items: ['Scheduling', 'Process Documentation', 'Reporting', 'Quality Checks'],
          acceptsAIImprovements: false,
        },
        {
          title: 'Education',
          type: 'entries',
          semanticType: 'education',
          classificationConfidence: 1,
          entries: [{ title: 'BS Business Administration', subtitle: 'Sample University', dates: '2019 - 2023' }],
          acceptsAIImprovements: false,
        },
      ],
    }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const left = 44
    const width = 507
    let y = 52
    const line = (text: string, size = 10, style: 'normal' | 'bold' = 'normal', gap = 15) => {
      doc.setFont('helvetica', style)
      doc.setFontSize(size)
      const rows = doc.splitTextToSize(text, width) as string[]
      doc.text(rows, left, y)
      y += rows.length * gap
    }
    const heading = (text: string) => {
      y += 6
      line(text.toUpperCase(), 12, 'bold', 15)
      doc.setDrawColor(49, 91, 125)
      doc.setLineWidth(0.8)
      doc.line(left, y - 8, left + width, y - 8)
      y += 4
    }

    line(data.name, 23, 'bold', 25)
    line(`${data.email} | ${data.location}`, 9, 'normal', 13)
    heading('Professional Summary')
    line(data.sections[0].type === 'text' ? data.sections[0].text ?? '' : '', 10, 'normal', 14)
    heading('Professional Experience')
    line('Operations Coordinator', 11, 'bold', 14)
    line('Sample Services Company', 10, 'bold', 14)
    line('2023 - Present', 9, 'normal', 13)
    line('Coordinated daily schedules and maintained accurate service documentation.', 10, 'normal', 14)
    line('Prepared weekly reports and followed up on operational exceptions.', 10, 'normal', 14)
    heading('Core Skills')
    for (const skill of ['Scheduling', 'Process Documentation', 'Reporting', 'Quality Checks']) line(skill, 10, 'normal', 13)
    heading('Education')
    line('BS Business Administration', 11, 'bold', 14)
    line('Sample University', 10, 'normal', 14)
    line('2019 - 2023', 9, 'normal', 13)

    const manifest = {
      schemaVersion: 1 as const,
      fixtures: [{
        id: 'jspdf-producer-selftest',
        pdf: 'source.pdf',
        data: 'data.json',
        expected: {
          columns: 1 as const,
          minimumConfidence: 0.55,
          minimumFidelity: 75,
          maximumPageExpansion: 1,
          capability: 'limited' as const,
        },
      }],
    }
    writeFileSync(join(root, 'source.pdf'), Buffer.from(doc.output('arraybuffer')))
    writeFileSync(join(root, 'data.json'), JSON.stringify(data, null, 2))
    writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2))

    const cases = await runSanitizedFixtureBenchmark(root)
    assert.equal(cases.length, 1)
    assert.equal(cases[0].status, 'passed')
    assert.equal(cases[0].metrics?.contentCoverage, 1)

    writeFileSync(join(root, 'manifest.json'), JSON.stringify({
      ...manifest,
      fixtures: [{ ...manifest.fixtures[0], pdf: '../outside.pdf' }],
    }, null, 2))
    await assert.rejects(
      () => runSanitizedFixtureBenchmark(root),
      /escapes the sanitized fixture directory/
    )

    writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2))
    writeFileSync(join(root, 'data.json'), JSON.stringify({ ...data, name: 'Mismatched Candidate' }, null, 2))
    await assert.rejects(
      () => runSanitizedFixtureBenchmark(root),
      /companion canonical JSON does not match the source fixture PDF/
    )

    console.log('Sanitized fixture intake self-test passed: jsPDF producer, path containment, and source-data integrity checks.')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
