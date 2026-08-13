import assert from 'node:assert/strict'
import type { ImprovedResumeData } from '../../types/resume'
import type { ResumeTemplateContract } from '../../types/resume-template-contract'

process.env.PDF_REGRESSION_TEST = '1'

type TemplateId = 'classic' | 'modern' | 'compact'
const templates: TemplateId[] = ['classic', 'modern', 'compact']

const fixtures: { name: string; expected: string[]; data: ImprovedResumeData }[] = [
  {
    name: 'nurse',
    expected: ['Maria Santos', 'Davao City, Philippines', 'Clinical Competencies', 'Phlebotomy', 'Staff Nurse', 'Example Hospital', 'Managed medication administration safely'],
    data: {
      name: 'Maria Santos', email: 'maria@example.com', phone: '09171234567', location: 'Davao City, Philippines', linkedin: '', github: '', website: '',
      sections: [
        { title: 'Professional Profile', type: 'text', semanticType: 'summary', classificationConfidence: 1, text: 'Registered nurse experienced in acute patient care, medication administration, and multidisciplinary coordination.', acceptsAIImprovements: true },
        { title: 'Clinical Competencies', type: 'list', semanticType: 'skills', classificationConfidence: 1, items: ['Phlebotomy', 'Wound Care', 'Patient Assessment', 'IV Therapy'], acceptsAIImprovements: false },
        { title: 'Professional Practice', type: 'entries', semanticType: 'experience', classificationConfidence: 1, entries: [{ title: 'Staff Nurse', subtitle: 'Example Hospital', dates: '2024 - Present', description: 'Acute-care nursing role.', bullets: ['Managed medication administration safely', 'Coordinated multidisciplinary patient handoffs'] }], acceptsAIImprovements: true },
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
  const { ResumeTemplateRenderer, UploadedResumeTemplateRenderer } = await import('../../components/pdf/ImprovedResumeTemplate')
  const { verifyRenderedResumePdf, verifyUploadedRenderedResumePdf } = await import('../../features/resume/services/resume-pdf-verification.service')
  const { verifyResumeTemplateFidelity } = await import('../../features/resume/services/resume-template-fidelity.service')
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

      const verification = await verifyRenderedResumePdf(
        new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
        fixture.data,
        templateId
      )
      assert.equal(verification.status, 'verified', `${templateId}/${fixture.name} failed rendered-content verification`)
      assert.equal(verification.contentCoverage, 1, `${templateId}/${fixture.name} did not preserve all expected rendered content`)
      assert.equal(verification.actualPages, parsed.totalPages, `${templateId}/${fixture.name} page count disagrees with parsed PDF`)
      assert.ok(verification.actualPages >= 1, `${templateId}/${fixture.name} must render at least one page`)

      rendered += 1
      const estimateNote = verification.pageDelta === 0 ? 'estimate matched' : `estimate delta ${verification.pageDelta > 0 ? '+' : ''}${verification.pageDelta}`
      console.log(`PASS ${templateId}/${fixture.name} (${verification.actualPages}p, ${estimateNote}, density ${verification.preflight.density})`)
    }
  }

  const mismatchSource = fixtures[2].data
  const mismatchElement = React.createElement(ResumeTemplateRenderer, { data: mismatchSource, templateId: 'classic' }) as unknown as Parameters<typeof renderToBuffer>[0]
  const mismatchBuffer = await renderToBuffer(mismatchElement)
  const mismatchExpected: ImprovedResumeData = {
    ...mismatchSource,
    sections: mismatchSource.sections.map((section) =>
      section.semanticType === 'skills' && section.type === 'list'
        ? { ...section, items: [...(section.items ?? []), 'UNRENDERED_SENTINEL_SKILL'] }
        : section
    ),
  }
  const mismatchVerification = await verifyRenderedResumePdf(
    new Uint8Array(mismatchBuffer.buffer, mismatchBuffer.byteOffset, mismatchBuffer.byteLength),
    mismatchExpected,
    'classic'
  )
  assert.equal(mismatchVerification.status, 'failed', 'Verifier should fail when expected resume content is absent from the rendered PDF')
  assert.ok(mismatchVerification.missingContent.some((item) => item.value === 'UNRENDERED_SENTINEL_SKILL'), 'Verifier should identify the missing rendered field')
  console.log('PASS rendered-content loss detection')

  const longData: ImprovedResumeData = {
    name: 'Long Resume Fixture',
    email: 'long@example.com',
    phone: '09170000000',
    location: 'Davao City, Philippines',
    linkedin: '',
    github: '',
    website: '',
    sections: [
      {
        title: 'Professional Summary',
        type: 'text',
        semanticType: 'summary',
        classificationConfidence: 1,
        text: 'Experienced operations professional coordinating complex workflows, cross-functional teams, service quality, documentation, training, scheduling, stakeholder communication, and continuous process improvement across multiple high-volume environments while maintaining accurate records and consistent delivery standards.',
        acceptsAIImprovements: true,
      },
      {
        title: 'Core Competencies',
        type: 'list',
        semanticType: 'skills',
        classificationConfidence: 1,
        items: Array.from({ length: 20 }, (_, index) => `Operational Competency ${index + 1}`),
        acceptsAIImprovements: false,
      },
      {
        title: 'Professional Experience',
        type: 'entries',
        semanticType: 'experience',
        classificationConfidence: 1,
        entries: Array.from({ length: 7 }, (_, index) => ({
          title: `Operations Role ${index + 1}`,
          subtitle: `Example Organization ${index + 1}`,
          dates: `20${18 + index} - 20${19 + index}`,
          bullets: [
            `Coordinated high-volume daily workflows across multiple teams while maintaining accurate documentation, service standards, and timely stakeholder communication for operational cycle ${index + 1}.`,
            `Monitored recurring process issues, documented corrective actions, and supported training activities that improved consistency across assigned responsibilities for operational cycle ${index + 1}.`,
            `Prepared detailed records, schedules, and follow-up actions while collaborating with internal and external stakeholders to resolve exceptions during operational cycle ${index + 1}.`,
            `Supported quality reviews and continuous-improvement activities by identifying bottlenecks and recommending practical workflow adjustments for operational cycle ${index + 1}.`,
          ],
        })),
        acceptsAIImprovements: true,
      },
    ],
  }
  for (const templateId of templates) {
    const longElement = React.createElement(ResumeTemplateRenderer, { data: longData, templateId }) as unknown as Parameters<typeof renderToBuffer>[0]
    const longBuffer = await renderToBuffer(longElement)
    const longVerification = await verifyRenderedResumePdf(
      new Uint8Array(longBuffer.buffer, longBuffer.byteOffset, longBuffer.byteLength),
      longData,
      templateId
    )
    assert.equal(longVerification.status, 'verified', `${templateId} long multi-page resume should preserve all expected content`)
    assert.ok(longVerification.actualPages >= 2, `${templateId} long fixture should render multiple pages, got ${longVerification.actualPages}`)
    console.log(`PASS ${templateId} multi-page render verification (${longVerification.actualPages}p, estimated ${longVerification.estimatedPages}p, density ${longVerification.preflight.density})`)
  }

  const uploadedContract: ResumeTemplateContract = {
    id: 'uploaded-two-column-regression-v1',
    source: 'uploaded',
    columnCount: 2,
    identityRegionId: 'header',
    summaryRegionId: 'summary',
    sectionOrder: ['summary', 'experience', 'skills', 'education', 'custom', 'unknown'],
    regions: [
      { id: 'header', role: 'header', column: 0, widthRatio: 1, preferredSemanticTypes: [], allowedSemanticTypes: [], preferredOrder: [] },
      { id: 'summary', role: 'full-width', column: 0, widthRatio: 1, preferredSemanticTypes: ['summary'], allowedSemanticTypes: ['summary'], preferredOrder: ['summary'], capacityLines: 10, overflowTo: 'right' },
      { id: 'left', role: 'secondary', column: 1, widthRatio: 0.34, preferredSemanticTypes: ['skills', 'education'], allowedSemanticTypes: ['skills', 'education'], preferredOrder: ['skills', 'education'], capacityLines: 18, overflowTo: 'right' },
      { id: 'right', role: 'primary', column: 2, widthRatio: 0.66, preferredSemanticTypes: ['experience', 'custom', 'unknown'], allowedSemanticTypes: ['experience', 'skills', 'education', 'custom', 'unknown'], preferredOrder: ['experience', 'skills', 'education', 'custom', 'unknown'], capacityLines: 44 },
    ],
    allowAdditionalPages: true,
    preserveHeadingTitles: true,
    minimumFontSize: 9,
    confidence: 0.92,
    sourcePageCount: 1,
  }
  const uploadedData: ImprovedResumeData = { ...fixtures[0].data, templateContract: uploadedContract }
  const uploadedElement = React.createElement(UploadedResumeTemplateRenderer, { data: uploadedData }) as unknown as Parameters<typeof renderToBuffer>[0]
  const uploadedBuffer = await renderToBuffer(uploadedElement)
  assert.equal(uploadedBuffer.subarray(0, 5).toString(), '%PDF-', 'uploaded contract renderer did not produce a PDF')
  const uploadedParsed = await extractText(new Uint8Array(uploadedBuffer.buffer, uploadedBuffer.byteOffset, uploadedBuffer.byteLength), { mergePages: true })
  const normalizeUploaded = (value: string) => value.toLocaleLowerCase().replace(/-\s+/g, '').replace(/[^a-z0-9]+/g, '')
  const uploadedText = normalizeUploaded(uploadedParsed.text)
  for (const expected of fixtures[0].expected) {
    assert.ok(uploadedText.includes(normalizeUploaded(expected)), `uploaded contract renderer lost expected content: ${expected}`)
  }
  const fidelity = await verifyResumeTemplateFidelity(
    new Uint8Array(uploadedBuffer.buffer, uploadedBuffer.byteOffset, uploadedBuffer.byteLength),
    uploadedData,
    uploadedContract
  )
  assert.equal(fidelity.status, 'verified', `uploaded contract geometry failed fidelity verification: ${fidelity.checks.filter((check) => !check.passed).map((check) => check.message).join('; ')}`)
  assert.equal(fidelity.actualContract.columnCount, 2, 'uploaded contract renderer should preserve a two-column body')
  console.log(`PASS uploaded contract render fidelity (${fidelity.score}% geometry score, ${uploadedParsed.totalPages}p)`)

  const uploadedVerification = await verifyUploadedRenderedResumePdf(
    new Uint8Array(uploadedBuffer.buffer, uploadedBuffer.byteOffset, uploadedBuffer.byteLength),
    uploadedData,
    uploadedContract
  )
  assert.equal(uploadedVerification.status, 'verified', 'uploaded combined content + geometry verification should pass')
  assert.equal(uploadedVerification.contentCoverage, 1, 'uploaded combined verification should preserve all expected content')
  assert.equal(uploadedVerification.templateFidelity?.score, fidelity.score, 'combined verification should include the geometry fidelity result')
  console.log('PASS uploaded combined render verification')

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
