import { inferSemanticTypeFromTitle, makeCanonicalField, resolveCanonicalField, toCanonicalResume, validateCanonicalResume } from '@/features/resume/services/canonical-resume.service'
import type { ImprovedResumeData } from '@/types/resume'

describe('canonical resume provenance', () => {
  it('adapts existing resume data without losing profession terminology', () => {
    const data: ImprovedResumeData = {
      name: 'Maria Santos', email: 'maria@example.com', phone: '', linkedin: '', github: '', website: '',
      sections: [{ title: 'Clinical Skills', type: 'list', semanticType: 'skills', items: ['Phlebotomy', 'Wound Care'], acceptsAIImprovements: false }],
    }
    const canonical = toCanonicalResume(data, 'resume')
    expect(canonical.identity.name.status).toBe('verified')
    expect(canonical.identity.name.evidence[0].source).toBe('resume')
    expect(canonical.sections[0].semanticType).toBe('skills')
    expect(canonical.sections[0].items?.[0].value).toBe('Phlebotomy')
    expect(validateCanonicalResume(canonical).valid).toBe(true)
  })

  it('merges matching facts and preserves both evidence sources', () => {
    const result = resolveCanonicalField(
      makeCanonicalField('Maria Santos', 'resume', 'Resume header'),
      makeCanonicalField('Maria Santos', 'portfolio', 'Portfolio hero'),
      'identity'
    )
    expect(result.status).toBe('verified')
    expect(result.evidence.map((e) => e.source)).toEqual(['resume', 'portfolio'])
  })

  it('marks conflicts and chooses the higher-authority identity source', () => {
    const result = resolveCanonicalField(
      makeCanonicalField('Maria Santos', 'resume', 'Resume header'),
      makeCanonicalField('Different Name', 'github', 'GitHub profile'),
      'identity'
    )
    expect(result.status).toBe('conflict')
    expect(result.value).toBe('Maria Santos')
    expect(result.conflicts).toHaveLength(2)
  })

  it('supports generic and unknown section classification', () => {
    expect(inferSemanticTypeFromTitle('Professional Licenses')).toBe('licenses')
    expect(inferSemanticTypeFromTitle('Community Contributions')).toBe('custom')
    expect(inferSemanticTypeFromTitle('Other')).toBe('unknown')
  })
})
