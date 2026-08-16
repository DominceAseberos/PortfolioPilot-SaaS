import type { ImprovedResumeData } from '@/types/resume'

export type ResumeDraftTemplateId = 'classic' | 'modern' | 'compact' | 'uploaded'

export interface ResumeDraftVersion {
  id: string
  label: string
  createdAt: string
  data: ImprovedResumeData
  templateId: ResumeDraftTemplateId
}

export interface ResumeDraftRecord {
  schemaVersion: 1
  key: string
  updatedAt: string
  data: ImprovedResumeData
  templateId: ResumeDraftTemplateId
  versions: ResumeDraftVersion[]
}

export interface ResumeDraftStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const STORAGE_PREFIX = 'portfoliopilot.resume-draft.v1:'
const MAX_VERSIONS = 20
const MAX_SERIALIZED_CHARS = 2_500_000

function normalizeDraftKey(value: string): string {
  const normalized = value.trim().replace(/[^A-Za-z0-9._:-]+/g, '-').slice(0, 160)
  return normalized || 'unsaved'
}

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${normalizeDraftKey(key)}`
}

function getBrowserStorage(): ResumeDraftStorage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function safeClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isTemplateId(value: unknown): value is ResumeDraftTemplateId {
  return value === 'classic' || value === 'modern' || value === 'compact' || value === 'uploaded'
}

function isImprovedResumeData(value: unknown): value is ImprovedResumeData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return typeof record.name === 'string' && Array.isArray(record.sections)
}

function parseRecord(raw: string, expectedKey: string): ResumeDraftRecord | null {
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const record = value as Partial<ResumeDraftRecord>
    if (
      record.schemaVersion !== 1
      || record.key !== normalizeDraftKey(expectedKey)
      || typeof record.updatedAt !== 'string'
      || !isImprovedResumeData(record.data)
      || !isTemplateId(record.templateId)
      || !Array.isArray(record.versions)
    ) return null

    const versions = record.versions.filter((version): version is ResumeDraftVersion => (
      Boolean(version)
      && typeof version === 'object'
      && typeof version.id === 'string'
      && typeof version.label === 'string'
      && typeof version.createdAt === 'string'
      && isImprovedResumeData(version.data)
      && isTemplateId(version.templateId)
    )).slice(0, MAX_VERSIONS)

    return {
      schemaVersion: 1,
      key: normalizeDraftKey(expectedKey),
      updatedAt: record.updatedAt,
      data: safeClone(record.data),
      templateId: record.templateId,
      versions: safeClone(versions),
    }
  } catch {
    return null
  }
}

function writeRecord(storage: ResumeDraftStorage, record: ResumeDraftRecord): ResumeDraftRecord {
  const serialized = JSON.stringify(record)
  if (serialized.length > MAX_SERIALIZED_CHARS) {
    throw new Error('Resume draft is too large to store safely in this browser.')
  }
  storage.setItem(storageKey(record.key), serialized)
  return safeClone(record)
}

export function loadResumeDraft(
  key: string,
  storage: ResumeDraftStorage | null = getBrowserStorage()
): ResumeDraftRecord | null {
  if (!storage) return null
  const normalizedKey = normalizeDraftKey(key)
  const targetKey = storageKey(normalizedKey)
  let raw: string | null = null
  try {
    raw = storage.getItem(targetKey)
  } catch {
    return null
  }
  if (!raw) return null

  const parsed = parseRecord(raw, normalizedKey)
  if (parsed) return parsed

  try {
    storage.removeItem(targetKey)
  } catch {
    // A broken storage backend should not prevent the editor from opening.
  }
  return null
}

export function saveResumeDraft(
  key: string,
  data: ImprovedResumeData,
  templateId: ResumeDraftTemplateId,
  storage: ResumeDraftStorage | null = getBrowserStorage()
): ResumeDraftRecord | null {
  if (!storage) return null
  const normalizedKey = normalizeDraftKey(key)
  const existing = loadResumeDraft(normalizedKey, storage)
  const record: ResumeDraftRecord = {
    schemaVersion: 1,
    key: normalizedKey,
    updatedAt: new Date().toISOString(),
    data: safeClone(data),
    templateId,
    versions: existing?.versions ?? [],
  }
  return writeRecord(storage, record)
}

export function createResumeDraftVersion(
  key: string,
  data: ImprovedResumeData,
  templateId: ResumeDraftTemplateId,
  label?: string,
  storage: ResumeDraftStorage | null = getBrowserStorage()
): ResumeDraftRecord | null {
  if (!storage) return null
  const normalizedKey = normalizeDraftKey(key)
  const existing = loadResumeDraft(normalizedKey, storage)
  const now = new Date().toISOString()
  const version: ResumeDraftVersion = {
    id: crypto.randomUUID(),
    label: label?.trim().slice(0, 80) || `Version ${existing?.versions.length ? existing.versions.length + 1 : 1}`,
    createdAt: now,
    data: safeClone(data),
    templateId,
  }

  return writeRecord(storage, {
    schemaVersion: 1,
    key: normalizedKey,
    updatedAt: now,
    data: safeClone(data),
    templateId,
    versions: [version, ...(existing?.versions ?? [])].slice(0, MAX_VERSIONS),
  })
}

export function duplicateResumeDraftVersion(
  key: string,
  versionId: string,
  storage: ResumeDraftStorage | null = getBrowserStorage()
): ResumeDraftRecord | null {
  if (!storage) return null
  const record = loadResumeDraft(key, storage)
  const source = record?.versions.find(version => version.id === versionId)
  if (!record || !source) return record

  const copy: ResumeDraftVersion = {
    ...safeClone(source),
    id: crypto.randomUUID(),
    label: `${source.label} Copy`.slice(0, 80),
    createdAt: new Date().toISOString(),
  }
  return writeRecord(storage, {
    ...record,
    updatedAt: copy.createdAt,
    versions: [copy, ...record.versions].slice(0, MAX_VERSIONS),
  })
}

export function deleteResumeDraftVersion(
  key: string,
  versionId: string,
  storage: ResumeDraftStorage | null = getBrowserStorage()
): ResumeDraftRecord | null {
  if (!storage) return null
  const record = loadResumeDraft(key, storage)
  if (!record) return null
  return writeRecord(storage, {
    ...record,
    updatedAt: new Date().toISOString(),
    versions: record.versions.filter(version => version.id !== versionId),
  })
}

export function clearResumeDraft(
  key: string,
  storage: ResumeDraftStorage | null = getBrowserStorage()
): void {
  if (!storage) return
  try {
    storage.removeItem(storageKey(key))
  } catch {
    // Clearing drafts is best-effort and should never crash the editor.
  }
}
