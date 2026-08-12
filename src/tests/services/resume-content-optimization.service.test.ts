import { applyResumeOptimizationRewrites, buildResumeOptimizationTargets } from '@/features/resume/services/resume-content-optimization.service'
import type { DynamicSection } from '@/types/resume'
import { ensureOriginalResumeProvenance } from '@/features/resume/services/resume-provenance.service'

describe('resume content optimization', () => {
  const sections: DynamicSection[] = [
    {
      title: 'Professional Summary',
      type: 'text',
      semanticType: 'summary',
      acceptsAIImprovements: true,
      text: Array.from({ length: 80 }, (_, i) => `word${i}`).join(' '),
    },
    {
      title: 'Experience',
      type: 'entries',
      semanticType: 'experience',
      acceptsAIImprovements: true,
      entries: [{
        title: 'Staff Nurse',
        subtitle: 'Example Hospital',
        dates: '2024 - Present',
        description: 'Managed care for 25 patients per shift while coordinating medication administration, discharge education, charting, handoffs, physician communication, safety checks, infection control, family updates, and emergency escalation across a high-volume medical unit with consistent documentation and multidisciplinary collaboration.',
      }],
    },
  ]

  it('targets only over-budget editable text fields', () => {
    const targets = buildResumeOptimizationTargets(sections, 'classic')
    expect(targets.map((target) => target.kind)).toEqual(['text', 'description'])
    expect(targets[0].maxWords).toBe(60)
    expect(targets[1].original).toContain('25 patients')
  })

  it('applies a safe shorter rewrite without touching protected entry facts', () => {
    const targets = buildResumeOptimizationTargets(sections, 'classic')
    const descriptionTarget = targets.find((target) => target.kind === 'description')!
    const next = applyResumeOptimizationRewrites(sections, targets, [{
      id: descriptionTarget.id,
      text: 'Managed care for 25 patients per shift, coordinating medication administration, discharge education, charting, handoffs, safety checks, infection control, and multidisciplinary communication.',
    }])

    const entry = next[1].type === 'entries' ? next[1].entries?.[0] : undefined
    expect(entry?.title).toBe('Staff Nurse')
    expect(entry?.subtitle).toBe('Example Hospital')
    expect(entry?.dates).toBe('2024 - Present')
    expect(entry?.description).toContain('25 patients')
    expect(entry?.description).not.toEqual(sections[1].type === 'entries' ? sections[1].entries?.[0].description : '')
  })

  it('preserves original provenance and appends AI evidence to accepted rewrites', () => {
    const withProvenance = ensureOriginalResumeProvenance(sections)
    const targets = buildResumeOptimizationTargets(withProvenance, 'classic')
    const descriptionTarget = targets.find((target) => target.kind === 'description')!
    const next = applyResumeOptimizationRewrites(withProvenance, targets, [{
      id: descriptionTarget.id,
      text: 'Managed care for 25 patients per shift, coordinating medication administration, discharge education, charting, handoffs, safety checks, infection control, and multidisciplinary communication.',
    }])

    const entry = next[1].type === 'entries' ? next[1].entries?.[0] : undefined
    expect(entry?.fieldEvidence?.description?.map((item) => item.source)).toEqual(['resume', 'ai'])
  })

  it('rejects a rewrite that invents a new numeric claim', () => {
    const targets = buildResumeOptimizationTargets(sections, 'classic')
    const descriptionTarget = targets.find((target) => target.kind === 'description')!
    const next = applyResumeOptimizationRewrites(sections, targets, [{
      id: descriptionTarget.id,
      text: 'Managed care for 100 patients per shift with safe medication administration and coordinated discharge education.',
    }])
    const entry = next[1].type === 'entries' ? next[1].entries?.[0] : undefined
    expect(entry?.description).toBe(sections[1].type === 'entries' ? sections[1].entries?.[0].description : '')
  })
})
