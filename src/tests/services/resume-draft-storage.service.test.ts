import type { ImprovedResumeData } from '@/types/resume'
import {
  clearResumeDraft,
  createResumeDraftVersion,
  deleteResumeDraftVersion,
  duplicateResumeDraftVersion,
  loadResumeDraft,
  saveResumeDraft,
  type ResumeDraftStorage,
} from '@/features/resume/services/resume-draft-storage.service'

class MemoryStorage implements ResumeDraftStorage {
  private values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
  setRaw(key: string, value: string) { this.values.set(key, value) }
}

const resume: ImprovedResumeData = {
  name: 'Jane Example',
  email: 'jane@example.com',
  phone: '',
  linkedin: '',
  github: '',
  website: '',
  sections: [{ title: 'Summary', type: 'text', text: 'Original summary.' }],
}

describe('resume draft storage', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  it('autosaves and restores the current editor state', () => {
    saveResumeDraft('analysis:123', resume, 'classic', storage)
    const loaded = loadResumeDraft('analysis:123', storage)

    expect(loaded?.data.name).toBe('Jane Example')
    expect(loaded?.templateId).toBe('classic')
    expect(loaded?.versions).toEqual([])
  })

  it('creates, duplicates, deletes, and restores version payloads without aliasing objects', () => {
    const first = createResumeDraftVersion('analysis:123', resume, 'modern', 'First pass', storage)
    const firstId = first?.versions[0]?.id
    expect(firstId).toBeTruthy()

    const duplicated = duplicateResumeDraftVersion('analysis:123', firstId!, storage)
    expect(duplicated?.versions).toHaveLength(2)
    expect(duplicated?.versions[0]?.label).toBe('First pass Copy')

    const afterDelete = deleteResumeDraftVersion('analysis:123', firstId!, storage)
    expect(afterDelete?.versions).toHaveLength(1)

    const loaded = loadResumeDraft('analysis:123', storage)
    expect(loaded?.versions[0]?.data.sections[0]).toEqual(resume.sections[0])
    expect(loaded?.versions[0]?.data).not.toBe(resume)
  })

  it('removes corrupt records rather than throwing during editor startup', () => {
    storage.setRaw('portfoliopilot.resume-draft.v1:analysis:123', '{broken')
    expect(loadResumeDraft('analysis:123', storage)).toBeNull()
    expect(storage.getItem('portfoliopilot.resume-draft.v1:analysis:123')).toBeNull()
  })

  it('clears saved drafts explicitly', () => {
    saveResumeDraft('analysis:123', resume, 'uploaded', storage)
    clearResumeDraft('analysis:123', storage)
    expect(loadResumeDraft('analysis:123', storage)).toBeNull()
  })

  it('rejects drafts that exceed the browser storage safety budget', () => {
    const huge = {
      ...resume,
      sections: [{ title: 'Summary', type: 'text', text: 'x'.repeat(2_600_000) }],
    } as ImprovedResumeData

    expect(() => saveResumeDraft('analysis:huge', huge, 'classic', storage)).toThrow(/too large/i)
  })
})
