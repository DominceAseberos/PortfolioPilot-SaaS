import assert from 'node:assert/strict'
import type { ImprovedResumeData } from '../../types/resume'

process.env.PDF_REGRESSION_TEST = '1'

type TemplateId = 'classic' | 'modern' | 'compact'
const templates: TemplateId[] = ['classic', 'modern', 'compact']

const fixtures: { name: string; expected: string[]; data: ImprovedResumeData }[] = [
  {
    name: 'nurse',
    expected: ['Maria Santos', 'Clinical Competencies', 'Phlebotomy', 'Staff Nurse', 'Example Hospital'],
    data: {
      name: 'Maria Santos', email: 'maria@example.com', phone: '09171234567', linkedin: '', github: '', website: '',
      sections: [
        { title: 'Professional Profile', type: 'text', semanticType: 'summary', classificationConfidence: 1, text: 'Registered nurse experienced in acute patient care, medication administration, and multidisciplinary coordination.', acceptsAIImprovements: true },
        { title: 'Clinical Competencies', type: 'list', semanticType: 'skills', classificationConfidence: 1, items: ['Phlebotomy', 'Wound Care', 'Patient Assessment', 'IV Therapy'], acceptsAIImprovements: false },
        { title: 'Professional Practice', type: 'entries', semanticType: 'experience', classificationConfidence: 1, entries: [{ title: 'Staff Nurse', subtitle: 'Example Hospital', dates: '2024 - Present', description: 'Managed patient care, medication administration, charting, discharge education, and multidisciplinary handoffs.' }], acceptsAIImprovements: true },
        { title: 'Education', type: 'entries', semanticType: 'education', classificationConfidence: 1, entries: [{ title: 'Bachelor of Science in Nursing', subtitle: 'Example University', dates: '2020 - 2024' }], acceptsAIImprovements: false },
      ],
    },
  },
  {
    name: 'teacher',
    expected: ['Ana Reyes', 'Teaching Methods', "Bloom's Taxonomy", 'Science Teacher', 'Example Academy'],
    data: {
      name: 'Ana Reyes', email: 'ana@example.com', phone: '', linkedin: '', github: '', website: '',
      sections: [
        { title: 'Summary', type: 'text', semanticType: 'summary', classificationConfidence: 1, text: 'Secondary educator focused on differentiated instruction, classroom management, and evidence-based lesson planning.', acceptsAIImprovements: true },
        { title: 'Teaching Methods', type: 'list', semanticType: 'skills', classificationConfidence: 1, items: ['Differentiated Instruction', 'Curriculum Mapping', "Bloom's Taxonomy", 'Classroom Management'], acceptsAIImprovements: false },
        { title: 'Teaching Experience', type: 'entries', semanticType: 'experience', classificationConfidence: 1, entries: [{ title: 'Science Teacher', subtitle: 'Example Academy', dates: '2023 - Present', description: 'Designed standards-aligned lessons, assessed learning outcomes, and coordinated parent and student support.' }], acceptsAIImprovements: true },
      ],
    },
  },
  {
    name: 'developer',
    expected: ['Jordan Cruz', 'PortfolioPilot', 'Next.js', 'Software Developer'],
    data: {
      name: 'Jordan Cruz', email: 'jordan@example.com', phone: '', linkedin: 'https://linkedin.com/in/jordan', github: 'https://github.com/jordan', website: 'https://jordan.dev',
      sections: [
        { title: 'Professional Summary', type: 'text', semanticType: 'summary', classificationConfidence: 1, text: 'Full-stack developer building reliable web applications and AI-assisted developer tools.', acceptsAIImprovements: true },
        { title: 'Experience', type: 'entries', semanticType: 'experience', classificationConfidence: 1, entries: [{ title: 'Software Developer', subtitle: 'Example Studio', dates: '2025 - Present', description: 'Built production web applications, APIs, and deployment workflows.' }], acceptsAIImprovements: true },
        { title: 'Projects', type: 'entries', semanticType: 'projects', classificationConfidence: 1, entries: [{ title: 'PortfolioPilot', subtitle: 'AI career assessment platform', link: 'https://example.com', description: 'Built with Next.js, Supabase, and LLM-assisted resume analysis.' }], acceptsAIImprovements: true },
        { title: 'Technologies', type: 'list', semanticType: 'skills', classificationConfidence: 1, items: ['Next.js', 'TypeScript', 'Supabase', 'PostgreSQL'], acceptsAIImprovements: false },
      ],
    },
  },
]

async function main() {
  const React = await import('react')
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { extractText } = await import('unpdf')
  const { jsPDF } = await import('jspdf')
  const { ResumeTemplateRenderer } = await import('../../components/pdf/ImprovedResumeTemplate')
  const { inspectPdfWithoutReadableText } = await import('../../features/resume/services/resume-scanned-pdf.service')

  let rendered = 0
  for (const fixture of fixtures) {
    for (const templateId of templates) {
      const element = React.createElement(ResumeTemplateRenderer, { data: fixture.data, templateId }) as unknown as Parameters<typeof renderToBuffer>[0]
      const buffer = await renderToBuffer(element)
      assert.equal(buffer.subarray(0, 5).toString(), '%PDF-', `${templateId}/${fixture.name} did not produce a PDF`)
      assert.ok(buffer.length > 2000, `${templateId}/${fixture.name} PDF is unexpectedly small`)

      const parsed = await extractText(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength), { mergePages: true })
      const text = parsed.text.replace(/\s+/g, ' ')
      const normalize = (value: string) => value.toLocaleLowerCase().replace(/-\s+/g, '').replace(/[^a-z0-9]+/g, '')
      const comparableText = normalize(text)
      for (const expected of fixture.expected) {
        assert.ok(comparableText.includes(normalize(expected)), `${templateId}/${fixture.name} lost expected content: ${expected}`)
      }
      rendered += 1
      console.log(`PASS ${templateId}/${fixture.name}`)
    }
  }

  const scanned = new jsPDF()
  scanned.addImage({ data: new Uint8ClampedArray([255, 255, 255, 255]), width: 1, height: 1 }, 'RGBA', 15, 15, 100, 100)
  const scannedBuffer = Buffer.from(scanned.output('arraybuffer'))
  const scanInspection = await inspectPdfWithoutReadableText(scannedBuffer)
  assert.equal(scanInspection.code, 'SCANNED_PDF', 'Image-only PDF should be detected as scanned')
  assert.ok(scanInspection.detectedImageCount > 0, 'Scanned PDF should contain an image drawing operator')
  console.log('PASS scanned/image-only detection')

  console.log(`Generated PDF regression passed: ${rendered} PDFs + scanned detection`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
