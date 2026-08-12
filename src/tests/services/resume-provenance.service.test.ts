import {
  collectEntryEvidence,
  decorateEnhancedResumeProvenance,
  ensureOriginalResumeProvenance,
  markEntryBulletsAsUserEdited,
  markEntryFieldAsUserEdited,
  markListItemAsUserAdded,
  markSectionTextAsUserEdited,
  normalizeResumeEvidenceKey,
} from '@/features/resume/services/resume-provenance.service'
import type { DynamicSection } from '@/types/resume'

const sources = (evidence = [] as { source: string }[]) => evidence.map((item) => item.source)

describe('resume provenance', () => {
  const original: DynamicSection[] = [
    {
      title: 'Professional Summary',
      type: 'text',
      semanticType: 'summary',
      text: 'Registered nurse focused on safe patient care.',
      acceptsAIImprovements: true,
    },
    {
      title: 'Clinical Competencies',
      type: 'list',
      semanticType: 'skills',
      items: ['Patient Assessment'],
      acceptsAIImprovements: true,
    },
    {
      title: 'Projects',
      type: 'entries',
      semanticType: 'projects',
      entries: [{ title: 'Portfolio Pilot', description: 'Career review application.' }],
      acceptsAIImprovements: true,
    },
  ]

  it('marks uploaded resume content as resume evidence', () => {
    const sections = ensureOriginalResumeProvenance(original)
    expect(sources(sections[0].provenance?.text)).toEqual(['resume'])
    expect(sources(sections[1].provenance?.items?.[normalizeResumeEvidenceKey('Patient Assessment')])).toEqual(['resume'])
    const entry = sections[2].type === 'entries' ? sections[2].entries?.[0] : undefined
    expect(sources(entry?.fieldEvidence?.title)).toEqual(['resume'])
    expect(sources(entry?.fieldEvidence?.description)).toEqual(['resume'])
  })

  it('marks evidence-backed GitHub additions as GitHub plus AI while preserving original sources', () => {
    const enhanced: DynamicSection[] = [
      original[0],
      {
        ...original[1],
        items: ['Patient Assessment', 'TypeScript'],
      },
      {
        ...original[2],
        entries: [
          { title: 'Portfolio Pilot', description: 'Built an AI-assisted career review application.', isEnhanced: true },
          { title: 'resume-tools', description: 'Developed resume tooling in TypeScript.', link: 'https://github.com/jane/resume-tools', isEnhanced: true },
        ],
      },
    ]

    const sections = decorateEnhancedResumeProvenance(original, enhanced, {
      githubUsername: 'jane',
      githubRepos: [
        { name: 'resume-tools', description: 'Resume tooling built with TypeScript', language: 'TypeScript' },
        { name: 'Portfolio-Pilot', description: 'AI career review application', language: 'TypeScript' },
      ],
    })

    const skills = sections[1]
    expect(sources(skills.provenance?.items?.[normalizeResumeEvidenceKey('Patient Assessment')])).toEqual(['resume'])
    expect(sources(skills.provenance?.items?.[normalizeResumeEvidenceKey('TypeScript')])).toEqual(['github', 'github', 'ai'])

    const projects = sections[2]
    const existing = projects.type === 'entries' ? projects.entries?.[0] : undefined
    const added = projects.type === 'entries' ? projects.entries?.[1] : undefined
    expect(sources(existing?.fieldEvidence?.title)).toEqual(['resume'])
    expect(sources(existing?.fieldEvidence?.description)).toEqual(['resume', 'github', 'ai'])
    expect(sources(added?.fieldEvidence?.title)).toEqual(['github'])
    expect(sources(added?.fieldEvidence?.description)).toEqual(['github', 'ai'])
  })

  it('marks portfolio-derived experience as portfolio evidence with AI wording on descriptions', () => {
    const enhanced: DynamicSection[] = [{
      title: 'Experience',
      type: 'entries',
      semanticType: 'experience',
      entries: [{
        title: 'Staff Nurse',
        subtitle: 'Example Hospital',
        dates: '2024 - Present',
        description: 'Coordinated patient care and clinical handoffs.',
      }],
      acceptsAIImprovements: true,
    }]

    const sections = decorateEnhancedResumeProvenance([], enhanced, {
      portfolioMarkdown: '# Experience\nStaff Nurse — Example Hospital',
      portfolioUrl: 'https://example.com',
    })
    const entry = sections[0].type === 'entries' ? sections[0].entries?.[0] : undefined
    expect(sources(entry?.fieldEvidence?.title)).toEqual(['portfolio'])
    expect(sources(entry?.fieldEvidence?.description)).toEqual(['portfolio', 'ai'])
  })

  it('tracks structured bullet provenance and appends user evidence on bullet edits', () => {
    const [section] = ensureOriginalResumeProvenance([{
      title: 'Experience',
      type: 'entries',
      semanticType: 'experience',
      entries: [{ title: 'Staff Nurse', bullets: ['Administered medications safely'] }],
      acceptsAIImprovements: true,
    }])
    const originalEntry = section.type === 'entries' ? section.entries?.[0] : undefined
    expect(sources(originalEntry?.bulletEvidence)).toEqual(['resume'])

    const edited = markEntryBulletsAsUserEdited(section, 0)
    const editedEntry = edited.type === 'entries' ? edited.entries?.[0] : undefined
    expect(sources(editedEntry?.bulletEvidence)).toEqual(['resume', 'user'])
    expect(sources(collectEntryEvidence(editedEntry!))).toContain('user')
  })

  it('appends user evidence without erasing the original source trail', () => {
    const [summary, skills, projects] = ensureOriginalResumeProvenance(original)
    const editedSummary = markSectionTextAsUserEdited({ ...summary, text: 'Edited summary.' })
    expect(sources(editedSummary.provenance?.text)).toEqual(['resume', 'user'])

    const editedSkills = markListItemAsUserAdded({ ...skills, items: [...(skills.items ?? []), 'Leadership'] }, 'Leadership')
    expect(sources(editedSkills.provenance?.items?.[normalizeResumeEvidenceKey('Leadership')])).toEqual(['user'])

    const editedProjects = markEntryFieldAsUserEdited(projects, 0, 'description')
    const entry = editedProjects.type === 'entries' ? editedProjects.entries?.[0] : undefined
    expect(sources(entry?.fieldEvidence?.description)).toEqual(['resume', 'user'])
    expect(sources(collectEntryEvidence(entry!))).toContain('user')
  })
})
