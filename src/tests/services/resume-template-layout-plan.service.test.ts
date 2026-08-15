import { analyzeUploadedTemplatePreflight, planResumeTemplateLayout } from '@/features/resume/services/resume-template-layout-plan.service'
import type { ImprovedResumeData } from '@/types/resume'
import type { ResumeTemplateContract } from '@/types/resume-template-contract'

const contract: ResumeTemplateContract = {
  id: 'uploaded-test-v1',
  source: 'uploaded',
  columnCount: 2,
  identityRegionId: 'header',
  summaryRegionId: 'main',
  sectionOrder: ['summary', 'experience', 'projects', 'skills', 'education', 'custom', 'unknown'],
  regions: [
    {
      id: 'header', role: 'header', column: 0, widthRatio: 1,
      preferredSemanticTypes: [], allowedSemanticTypes: [], preferredOrder: [],
    },
    {
      id: 'sidebar', role: 'secondary', column: 1, widthRatio: 0.32,
      preferredSemanticTypes: ['skills', 'education'], allowedSemanticTypes: ['skills', 'education'],
      preferredOrder: ['skills', 'education'], capacityLines: 9, overflowTo: 'main',
    },
    {
      id: 'main', role: 'primary', column: 2, widthRatio: 0.68,
      preferredSemanticTypes: ['summary', 'experience', 'projects', 'custom', 'unknown'],
      allowedSemanticTypes: ['summary', 'experience', 'projects', 'skills', 'education', 'custom', 'unknown'],
      preferredOrder: ['summary', 'experience', 'projects', 'skills', 'education', 'custom', 'unknown'],
      capacityLines: 44,
    },
  ],
  allowAdditionalPages: true,
  preserveHeadingTitles: true,
  minimumFontSize: 9,
  confidence: 0.9,
  sourcePageCount: 1,
}

const data: ImprovedResumeData = {
  name: 'Alex Rivera',
  email: 'alex@example.com',
  phone: '+63 912 345 6789',
  linkedin: '',
  github: '',
  website: '',
  templateContract: contract,
  sections: [
    {
      title: 'Profile', type: 'text', semanticType: 'summary', classificationConfidence: 1,
      text: 'Operations professional focused on reliable service delivery.', acceptsAIImprovements: true,
    },
    {
      title: 'Experience', type: 'entries', semanticType: 'experience', classificationConfidence: 1,
      entries: [{ title: 'Operations Coordinator', subtitle: 'Example Company', dates: '2023 - Present', bullets: ['Coordinated daily service requests across multiple teams.'] }],
      acceptsAIImprovements: false,
    },
    {
      title: 'Skills', type: 'list', semanticType: 'skills', classificationConfidence: 1,
      items: ['Scheduling', 'Inventory Control', 'Customer Service', 'Process Documentation', 'Quality Checks', 'Incident Tracking'],
      acceptsAIImprovements: false,
    },
    {
      title: 'Education', type: 'entries', semanticType: 'education', classificationConfidence: 1,
      entries: [{ title: 'BS Business Administration', subtitle: 'Example University', dates: '2019 - 2023' }],
      acceptsAIImprovements: false,
    },
  ],
}

describe('resume template layout plan', () => {
  it('moves complete sections out of an overloaded secondary region without losing content', () => {
    const plan = planResumeTemplateLayout(data, contract)
    const sidebar = plan.regions.find((item) => item.region.id === 'sidebar')
    const main = plan.regions.find((item) => item.region.id === 'main')

    expect(plan.overflowMoves.length).toBeGreaterThan(0)
    expect(sidebar?.estimatedLines).toBeLessThanOrEqual(sidebar?.capacityLines ?? 0)

    const renderedTitles = plan.regions.flatMap((item) => item.sections.map((section) => section.title)).sort()
    expect(renderedTitles).toEqual(['Education', 'Experience', 'Profile', 'Skills'].sort())
    expect(main?.sections.some((section) => section.title === plan.overflowMoves[0].sectionTitle)).toBe(true)
  })

  it('allows a primary region to require more pages instead of deleting content', () => {
    const dense: ImprovedResumeData = {
      ...data,
      sections: data.sections.map((section) => section.title !== 'Experience' ? section : {
        ...section,
        entries: Array.from({ length: 12 }, (_, index) => ({
          title: `Operations Role ${index + 1}`,
          subtitle: 'Example Company',
          dates: '2020 - Present',
          bullets: ['Coordinated complex operational workflows and documented measurable service improvements across teams.'],
        })),
      }),
    }

    const plan = planResumeTemplateLayout(dense, contract)
    const main = plan.regions.find((item) => item.region.id === 'main')
    expect(main?.fit).toBe('overflow-risk')
    expect(main?.requiredPages).toBeGreaterThan(1)
    expect(plan.estimatedPages).toBeGreaterThan(1)
    expect(plan.regions.flatMap((item) => item.sections).find((section) => section.title === 'Experience')).toBeDefined()
  })

  it('accepts continuation graphics that match the flowing renderer repeat policy', () => {
    const graphics = {
      bodyTextColor: '#111827',
      accentTextColor: '#2563eb',
      dividerColor: '#2563eb',
      dividerWidth: 0.8,
      backgroundRegions: [
        { color: '#f1f5f9', xRatio: 0, topRatio: 0, widthRatio: 0.32, heightRatio: 1 },
      ],
    }
    const repeatableContract: ResumeTemplateContract = {
      ...contract,
      sourcePageCount: 2,
      graphics,
      pageGraphics: [
        { pageNumber: 1, graphics },
        { pageNumber: 2, graphics },
      ],
    }

    const preflight = analyzeUploadedTemplatePreflight({ ...data, templateContract: repeatableContract }, repeatableContract)
    expect(preflight.warnings.some((warning) => warning.code === 'page-graphics-variation')).toBe(false)
  })

  it('warns before export when continuation artwork cannot be reproduced by the flowing renderer', () => {
    const firstPageGraphics = {
      bodyTextColor: '#111827',
      backgroundRegions: [
        { color: '#f1f5f9', xRatio: 0, topRatio: 0, widthRatio: 0.32, heightRatio: 1 },
      ],
    }
    const pageSpecificContract: ResumeTemplateContract = {
      ...contract,
      sourcePageCount: 2,
      graphics: firstPageGraphics,
      pageGraphics: [
        { pageNumber: 1, graphics: firstPageGraphics },
        {
          pageNumber: 2,
          graphics: {
            bodyTextColor: '#111827',
            backgroundRegions: [
              { color: '#fee2e2', xRatio: 0.68, topRatio: 0, widthRatio: 0.32, heightRatio: 1 },
            ],
          },
        },
      ],
    }

    const preflight = analyzeUploadedTemplatePreflight({ ...data, templateContract: pageSpecificContract }, pageSpecificContract)
    expect(preflight.warnings.some((warning) => warning.code === 'page-graphics-variation')).toBe(true)
    expect(preflight.recommendations.some((recommendation) => recommendation.includes('built-in template'))).toBe(true)
  })
})
