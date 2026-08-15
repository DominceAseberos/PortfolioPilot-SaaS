import assert from 'node:assert/strict'
import React from 'react'
import { Document, Image, Page, Text, View, renderToBuffer } from '@react-pdf/renderer'
import type { ImprovedResumeData } from '../../types/resume'
import { extractResumeLayout } from '../../features/resume/services/resume-layout-extraction.service'
import { verifyUploadedRenderedResumePdf } from '../../features/resume/services/resume-pdf-verification.service'
import { buildResumeTemplateCapabilityReport } from '../../features/resume/services/resume-template-capability.service'
import { writeReliabilitySuiteReport, type ReliabilityCaseResult } from './resume-reliability-report'
import { UploadedResumeTemplateRenderer } from '../../components/pdf/ImprovedResumeTemplate'

interface CorpusExpectation {
  columns: 1 | 2
  fontClass: 'sans' | 'serif' | 'mono'
  minimumFidelity: number
  minimumSourcePages?: number
  maxPageExpansion: number
  capability: 'verified' | 'limited'
  unsupportedFeature?: string
}

interface CorpusFixture {
  id: string
  description: string
  data: ImprovedResumeData
  expectation: CorpusExpectation
  source: React.ReactElement
}

const baseData: ImprovedResumeData = {
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
  phone: '+63 912 345 6789',
  location: 'Davao City, Philippines',
  linkedin: 'https://linkedin.com/in/alexrivera',
  github: '',
  website: '',
  sections: [
    {
      title: 'Professional Summary',
      type: 'text',
      semanticType: 'summary',
      classificationConfidence: 1,
      text: 'Operations analyst experienced in service delivery, process documentation, reporting, stakeholder coordination, and continuous improvement.',
      acceptsAIImprovements: true,
    },
    {
      title: 'Professional Experience',
      type: 'entries',
      semanticType: 'experience',
      classificationConfidence: 1,
      entries: [
        {
          title: 'Operations Analyst',
          subtitle: 'Example Services Group',
          dates: '2023 - Present',
          bullets: [
            'Coordinated recurring operational workflows across multiple teams and maintained accurate service documentation.',
            'Prepared weekly performance reports and followed up on exceptions with internal stakeholders.',
          ],
        },
        {
          title: 'Operations Assistant',
          subtitle: 'Example Logistics',
          dates: '2021 - 2023',
          bullets: [
            'Maintained schedules, inventory records, and customer-service follow-up for daily operations.',
          ],
        },
      ],
      acceptsAIImprovements: true,
    },
    {
      title: 'Core Skills',
      type: 'list',
      semanticType: 'skills',
      classificationConfidence: 1,
      items: ['Process Documentation', 'Reporting', 'Scheduling', 'Quality Checks', 'Stakeholder Coordination', 'Excel'],
      acceptsAIImprovements: false,
    },
    {
      title: 'Education',
      type: 'entries',
      semanticType: 'education',
      classificationConfidence: 1,
      entries: [{ title: 'BS Business Administration', subtitle: 'Example University', dates: '2017 - 2021' }],
      acceptsAIImprovements: false,
    },
    {
      title: 'Projects',
      type: 'entries',
      semanticType: 'projects',
      classificationConfidence: 1,
      entries: [{ title: 'Operations Dashboard', subtitle: 'Internal reporting project', dates: '2025', bullets: ['Standardized weekly metrics into a reusable reporting dashboard.'] }],
      acceptsAIImprovements: true,
    },
  ],
}

const denseData: ImprovedResumeData = {
  ...baseData,
  sections: baseData.sections.map((section) => {
    if (section.semanticType !== 'experience') return section
    return {
      ...section,
      entries: Array.from({ length: 8 }, (_, index) => ({
        title: `Operations Role ${index + 1}`,
        subtitle: `Example Organization ${index + 1}`,
        dates: `20${16 + index} - 20${17 + index}`,
        bullets: [
          `Coordinated service workflows, schedules, documentation, and stakeholder follow-up for operating cycle ${index + 1}.`,
          `Reviewed recurring process exceptions and supported practical corrective actions for operating cycle ${index + 1}.`,
          `Prepared detailed records and performance updates while maintaining consistent service standards for operating cycle ${index + 1}.`,
        ],
      })),
    }
  }),
}

const contactLine = `${baseData.email}  |  ${baseData.phone}  |  ${baseData.location}`
const dark = '#1f2937'
const accent = '#315b7d'
const sidebar = '#243b53'
const tinyLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

function SectionTitle({ children, color = accent }: { children: React.ReactNode; color?: string }) {
  return <Text style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4, textTransform: 'uppercase' }}>{children}</Text>
}

function Divider({ color = '#9aa5b1' }: { color?: string }) {
  return <View style={{ borderBottomWidth: 0.7, borderBottomColor: color, marginBottom: 7 }} />
}

function SummaryBlock({ color = dark }: { color?: string }) {
  const section = baseData.sections.find((item) => item.semanticType === 'summary')!
  return (
    <View style={{ marginBottom: 13 }}>
      <SectionTitle color={color}>{section.title}</SectionTitle>
      <Divider color={color} />
      <Text>{section.type === 'text' ? section.text : ''}</Text>
    </View>
  )
}

function ExperienceBlock({ data = baseData, color = dark }: { data?: ImprovedResumeData; color?: string }) {
  const section = data.sections.find((item) => item.semanticType === 'experience')!
  return (
    <View style={{ marginBottom: 13 }}>
      <SectionTitle color={color}>{section.title}</SectionTitle>
      <Divider color={color} />
      {section.type === 'entries' && section.entries?.map((entry, index) => (
        <View key={`${entry.title}-${index}`} style={{ marginBottom: 8 }} wrap={false}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: 700 }}>{entry.title}</Text>
            <Text style={{ fontSize: 8.5 }}>{entry.dates}</Text>
          </View>
          <Text style={{ fontWeight: 600, marginTop: 1 }}>{entry.subtitle}</Text>
          {entry.bullets?.map((bullet) => <Text key={bullet} style={{ marginTop: 2 }}>• {bullet}</Text>)}
        </View>
      ))}
    </View>
  )
}

function SkillsBlock({ light = false }: { light?: boolean }) {
  const section = baseData.sections.find((item) => item.semanticType === 'skills')!
  const textColor = light ? '#ffffff' : dark
  return (
    <View style={{ marginBottom: 13 }}>
      <SectionTitle color={textColor}>{section.title}</SectionTitle>
      <Divider color={light ? '#9fb3c8' : accent} />
      {section.type === 'list' && section.items?.map((item) => <Text key={item} style={{ marginBottom: 3, color: textColor }}>• {item}</Text>)}
    </View>
  )
}

function EducationBlock({ light = false }: { light?: boolean }) {
  const section = baseData.sections.find((item) => item.semanticType === 'education')!
  const textColor = light ? '#ffffff' : dark
  const entry = section.type === 'entries' ? section.entries?.[0] : undefined
  return (
    <View style={{ marginBottom: 13 }}>
      <SectionTitle color={textColor}>{section.title}</SectionTitle>
      <Divider color={light ? '#9fb3c8' : accent} />
      <Text style={{ color: textColor, fontWeight: 700 }}>{entry?.title}</Text>
      <Text style={{ color: textColor }}>{entry?.subtitle}</Text>
      <Text style={{ color: textColor, fontSize: 8.5 }}>{entry?.dates}</Text>
    </View>
  )
}

function ProjectsBlock() {
  const section = baseData.sections.find((item) => item.semanticType === 'projects')!
  const entry = section.type === 'entries' ? section.entries?.[0] : undefined
  return (
    <View style={{ marginBottom: 13 }}>
      <SectionTitle>{section.title}</SectionTitle>
      <Divider color={accent} />
      <Text style={{ fontWeight: 700 }}>{entry?.title}</Text>
      <Text>{entry?.subtitle}</Text>
      {entry?.bullets?.map((bullet) => <Text key={bullet} style={{ marginTop: 2 }}>• {bullet}</Text>)}
    </View>
  )
}

function CenteredSerifSource() {
  return (
    <Document>
      <Page size="A4" style={{ padding: 46, fontFamily: 'Times-Roman', fontSize: 10.5, lineHeight: 1.35, color: dark }}>
        <View style={{ textAlign: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: 700 }}>Alex Rivera</Text>
          <Text style={{ fontSize: 10, marginTop: 4 }}>Operations Analyst</Text>
          <Text style={{ fontSize: 9, marginTop: 5 }}>{contactLine}</Text>
        </View>
        <SummaryBlock />
        <ExperienceBlock />
        <ProjectsBlock />
        <SkillsBlock />
        <EducationBlock />
      </Page>
    </Document>
  )
}

function MinimalSansSource({ withLogo = false }: { withLogo?: boolean }) {
  return (
    <Document>
      <Page size="A4" style={{ padding: '36 40', fontFamily: 'Helvetica', fontSize: 9.5, lineHeight: 1.35, color: '#202124' }}>
        <View style={{ marginBottom: 17 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {withLogo && (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not expose an HTML alt prop.
              <Image src={tinyLogo} style={{ width: 18, height: 18 }} />
            )}
            <Text style={{ fontSize: 21, fontWeight: 700 }}>Alex Rivera</Text>
          </View>
          <Text style={{ fontSize: 9, marginTop: 4 }}>{contactLine}</Text>
        </View>
        <SummaryBlock color="#4a5568" />
        <ExperienceBlock color="#4a5568" />
        <ProjectsBlock />
        <SkillsBlock />
        <EducationBlock />
      </Page>
    </Document>
  )
}

function HeaderBandTwoColumnSource() {
  return (
    <Document>
      <Page size="A4" style={{ padding: '30 34 34', fontFamily: 'Helvetica', fontSize: 9.3, lineHeight: 1.3, color: dark }}>
        <View style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 104, backgroundColor: sidebar }} />
        <View style={{ height: 76, color: '#ffffff', marginBottom: 15 }}>
          <Text style={{ fontSize: 22, fontWeight: 700 }}>Alex Rivera</Text>
          <Text style={{ fontSize: 10, marginTop: 3 }}>Operations Analyst</Text>
          <Text style={{ fontSize: 8.8, marginTop: 5 }}>{contactLine}</Text>
        </View>
        <SummaryBlock />
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <View style={{ width: '34%' }}>
            <SkillsBlock />
            <EducationBlock />
          </View>
          <View style={{ width: '66%' }}>
            <ExperienceBlock />
            <ProjectsBlock />
          </View>
        </View>
      </Page>
    </Document>
  )
}

function SidebarTwoColumnSource({ data = baseData }: { data?: ImprovedResumeData }) {
  return (
    <Document>
      <Page size="A4" style={{ padding: '32 32 36', fontFamily: 'Helvetica', fontSize: 9.2, lineHeight: 1.3, color: dark }}>
        <View fixed style={{ position: 'absolute', left: 0, top: 108, width: 190, height: 734, backgroundColor: sidebar }} />
        <View style={{ height: 68, marginBottom: 18 }}>
          <Text style={{ fontSize: 22, fontWeight: 700 }}>Alex Rivera</Text>
          <Text style={{ fontSize: 9, marginTop: 4 }}>{contactLine}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={{ width: '31%', padding: '14 8', color: '#ffffff' }}>
            <SkillsBlock light />
            <EducationBlock light />
          </View>
          <View style={{ width: '69%' }}>
            <SummaryBlock />
            <ExperienceBlock data={data} />
            <ProjectsBlock />
          </View>
        </View>
      </Page>
    </Document>
  )
}

const corpus: CorpusFixture[] = [
  {
    id: 'centered-serif-single',
    description: 'Centered identity, serif typography, single-column body',
    data: baseData,
    expectation: { columns: 1, fontClass: 'serif', minimumFidelity: 88, maxPageExpansion: 0, capability: 'limited' },
    source: <CenteredSerifSource />,
  },
  {
    id: 'minimal-sans-single',
    description: 'Left-aligned minimal sans single-column layout',
    data: baseData,
    expectation: { columns: 1, fontClass: 'sans', minimumFidelity: 90, maxPageExpansion: 0, capability: 'limited' },
    source: <MinimalSansSource />,
  },
  {
    id: 'header-band-two-column',
    description: 'Dark header band, full-width summary, two-column content',
    data: baseData,
    expectation: { columns: 2, fontClass: 'sans', minimumFidelity: 88, maxPageExpansion: 0, capability: 'limited' },
    source: <HeaderBandTwoColumnSource />,
  },
  {
    id: 'sidebar-two-column',
    description: 'Persistent dark sidebar with primary content column',
    data: baseData,
    expectation: { columns: 2, fontClass: 'sans', minimumFidelity: 88, maxPageExpansion: 0, capability: 'limited' },
    source: <SidebarTwoColumnSource />,
  },
  {
    id: 'multi-page-sidebar',
    description: 'Dense multi-page content with repeatable continuation sidebar',
    data: denseData,
    expectation: { columns: 2, fontClass: 'sans', minimumFidelity: 84, minimumSourcePages: 2, maxPageExpansion: 1, capability: 'limited' },
    source: <SidebarTwoColumnSource data={denseData} />,
  },
  {
    id: 'raster-logo-limited',
    description: 'Minimal layout containing an intentionally unsupported raster logo',
    data: baseData,
    expectation: { columns: 1, fontClass: 'sans', minimumFidelity: 88, maxPageExpansion: 0, capability: 'limited', unsupportedFeature: 'raster-image' },
    source: <MinimalSansSource withLogo />,
  },
]

async function main() {
  const rows: Array<Record<string, string | number>> = []

  for (const fixture of corpus) {
    const sourceBuffer = await renderToBuffer(fixture.source as Parameters<typeof renderToBuffer>[0])
    const sourceLayout = await extractResumeLayout(Buffer.from(sourceBuffer))
    const contract = sourceLayout.templateContract
    const capability = buildResumeTemplateCapabilityReport(contract)
    assert.equal(contract.columnCount, fixture.expectation.columns, `${fixture.id}: source contract inferred ${contract.columnCount} columns`)
    assert.equal(contract.style?.fontClass, fixture.expectation.fontClass, `${fixture.id}: unexpected inferred font class ${contract.style?.fontClass}`)
    assert.ok(contract.confidence >= 0.55, `${fixture.id}: inferred contract confidence ${contract.confidence} is too low`)
    if (fixture.expectation.minimumSourcePages) {
      assert.ok(sourceLayout.totalPages >= fixture.expectation.minimumSourcePages, `${fixture.id}: source should span at least ${fixture.expectation.minimumSourcePages} pages`)
    }

    assert.equal(capability.overall, fixture.expectation.capability, `${fixture.id}: unexpected capability status ${capability.overall}`)
    if (fixture.expectation.unsupportedFeature) {
      assert.ok(
        capability.items.some((item) => item.status === 'unsupported' && item.label.toLowerCase().includes('raster')),
        `${fixture.id}: expected unsupported ${fixture.expectation.unsupportedFeature} capability`
      )
    } else {
      assert.equal(capability.counts.unsupported, 0, `${fixture.id}: supported corpus family should not report unsupported features`)
    }

    const renderData: ImprovedResumeData = { ...fixture.data, templateContract: contract }
    const renderedBuffer = await renderToBuffer(<UploadedResumeTemplateRenderer data={renderData} />)
    const verification = await verifyUploadedRenderedResumePdf(
      new Uint8Array(renderedBuffer.buffer, renderedBuffer.byteOffset, renderedBuffer.byteLength),
      renderData,
      contract
    )

    assert.equal(verification.status, 'verified', `${fixture.id}: combined render verification failed: ${verification.templateFidelity?.checks.filter((check) => !check.passed).map((check) => check.message).join('; ')}`)
    assert.equal(verification.contentCoverage, 1, `${fixture.id}: expected content coverage must remain 100%`)
    const fidelity = verification.templateFidelity?.score ?? 0
    assert.ok(fidelity >= fixture.expectation.minimumFidelity, `${fixture.id}: fidelity ${fidelity}% fell below ${fixture.expectation.minimumFidelity}%`)
    const pageExpansion = Math.max(0, verification.actualPages - sourceLayout.totalPages)
    assert.ok(
      pageExpansion <= fixture.expectation.maxPageExpansion,
      `${fixture.id}: rendered page count expanded by ${pageExpansion}, above the allowed ${fixture.expectation.maxPageExpansion}`
    )

    rows.push({
      template: fixture.id,
      columns: contract.columnCount,
      sourcePages: sourceLayout.totalPages,
      renderedPages: verification.actualPages,
      confidence: `${Math.round(contract.confidence * 100)}%`,
      fidelity: `${fidelity}%`,
      capability: capability.overall,
      unsupported: capability.counts.unsupported,
    })
  }

  console.table(rows)
  const minimum = Math.min(...rows.map((row) => Number(String(row.fidelity).replace('%', ''))))
  const average = Math.round(rows.reduce((sum, row) => sum + Number(String(row.fidelity).replace('%', '')), 0) / rows.length)
  const reportCases: ReliabilityCaseResult[] = rows.map((row) => ({
    id: String(row.template),
    status: 'passed',
    metrics: {
      columns: Number(row.columns),
      sourcePages: Number(row.sourcePages),
      renderedPages: Number(row.renderedPages),
      confidence: String(row.confidence),
      fidelity: String(row.fidelity),
      capability: String(row.capability),
      unsupported: Number(row.unsupported),
    },
  }))
  writeReliabilitySuiteReport('Template Corpus Benchmark', reportCases, {
    families: rows.length,
    averageFidelity: `${average}%`,
    minimumFidelity: `${minimum}%`,
    exactPageCountMatches: rows.filter((row) => row.sourcePages === row.renderedPages).length,
  })
  console.log(`Template corpus benchmark passed: ${rows.length} families, ${average}% average fidelity, ${minimum}% minimum fidelity.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
