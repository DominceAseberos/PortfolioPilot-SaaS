import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, Eye, FileText, CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2, Sparkles, AlertTriangle, LayoutTemplate, Columns, History, Copy, Save } from 'lucide-react'
import { BlobProvider } from '@react-pdf/renderer'
import { ImprovedResumeData, type ResumeTemplateChoiceId, ResumeTemplateChoiceRenderer } from '@/components/pdf/ImprovedResumeTemplate'
import { ResumeTemplatePicker } from '@/components/dashboard/ResumeTemplatePicker'
import { SectionClassificationReview } from '@/components/dashboard/SectionClassificationReview'
import { ResumeEvidenceBadge } from '@/components/dashboard/ResumeEvidenceBadge'
import { InitialResumeChangesReview } from '@/components/dashboard/InitialResumeChangesReview'
import { analyzeResumePreflight, type ResumePreflightResult } from '@/features/resume/services/resume-layout.service'
import { analyzeUploadedTemplatePreflight } from '@/features/resume/services/resume-template-layout-plan.service'
import { buildResumeTemplateCapabilityReport } from '@/features/resume/services/resume-template-capability.service'
import type { ResumeRenderVerificationResult } from '@/features/resume/services/resume-pdf-verification.service'
import type { ResumeChangeOperation } from '@/features/resume/services/resume-diff.service'
import { getSectionSemanticType, reorderResumeSections } from '@/features/resume/services/resume-template-allocation.service'
import { recommendResumeTemplate } from '@/features/resume/services/resume-template-recommendation.service'
import { normalizeManualSectionClassification } from '@/features/resume/services/resume-section-classification.service'
import {
  collectEntryEvidence,
  markEntryBulletsAsUserEdited,
  markEntryFieldAsUserEdited,
  markListItemAsUserAdded,
  markResumeIdentityFieldAsUserEdited,
  markSectionTextAsUserEdited,
  normalizeResumeEvidenceKey,
} from '@/features/resume/services/resume-provenance.service'
import {
  removeReviewedSectionOperations,
  restoreOriginalResumeSection,
  type ResumeChangeGroup,
} from '@/features/resume/services/resume-change-review.service'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import type { DynamicSection, ResumeSemanticSectionType } from '@/types/resume'
import type { ResumeEntryEvidenceField, ResumeIdentityEvidenceField } from '@/types/resume-provenance'
import { clearResumeDraft, createResumeDraftVersion, deleteResumeDraftVersion, duplicateResumeDraftVersion, loadResumeDraft, saveResumeDraft, type ResumeDraftRecord, type ResumeDraftVersion } from '@/features/resume/services/resume-draft-storage.service'
import { startResumeWorkflowMeasure } from '@/features/resume/utils/resume-performance'

export interface ImprovedResumeModalProps {
  initialData: ImprovedResumeData
  resumeFile: File | null
  onClose: () => void
  draftKey?: string
}

type JsonRecord = Record<string, unknown>

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function readJsonObject(response: Response): Promise<JsonRecord> {
  try {
    const value: unknown = await response.json()
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as JsonRecord
  } catch {
    // Fall through to a stable error below.
  }
  throw new Error(response.ok ? 'The server returned an invalid response.' : `Request failed (${response.status}).`)
}
interface ResumeOptimizationProposal {
  sections: DynamicSection[]
  operations: ResumeChangeOperation[]
  before: ResumePreflightResult
  after: ResumePreflightResult
}

export default function ImprovedResumeModal({ initialData, resumeFile, onClose, draftKey }: ImprovedResumeModalProps) {
  const [initialDraft] = useState(() => draftKey ? loadResumeDraft(draftKey) : null)
  const [data, setData] = useState<ImprovedResumeData>(() => initialDraft?.data ?? initialData)
  const [activeTab, setActiveTab] = useState<'original' | 'edit' | 'preview'>('edit')
  const [step, setStep] = useState<'pick-template' | 'edit'>('pick-template')
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateChoiceId>(() => initialDraft?.templateId ?? recommendResumeTemplate(initialData).templateId)
  const [compareMode, setCompareMode] = useState(false)
  const [previewData, setPreviewData] = useState<ImprovedResumeData>(() => initialDraft?.data ?? initialData)
  const [optimizationProposal, setOptimizationProposal] = useState<ResumeOptimizationProposal | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const [optimizationError, setOptimizationError] = useState<string | null>(null)
  const [pdfVerification, setPdfVerification] = useState<ResumeRenderVerificationResult | null>(null)
  const [verifyingPdf, setVerifyingPdf] = useState(false)
  const [pdfVerificationError, setPdfVerificationError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [draftRecord, setDraftRecord] = useState<ResumeDraftRecord | null>(initialDraft)
  const [draftStatus, setDraftStatus] = useState<string | null>(draftKey ? (initialDraft ? 'Draft restored.' : 'Autosave ready.') : null)
  const [showVersions, setShowVersions] = useState(false)
  const optimizationAbortRef = useRef<AbortController | null>(null)
  const verificationAbortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const requestRevisionRef = useRef(0)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const busy = optimizing || verifyingPdf
  const editingLocked = busy
  const preflight = selectedTemplate === 'uploaded' && data.templateContract?.source === 'uploaded'
    ? analyzeUploadedTemplatePreflight(data, data.templateContract)
    : analyzeResumePreflight(data, selectedTemplate === 'uploaded' ? 'classic' : selectedTemplate)
  const capabilityReport = selectedTemplate === 'uploaded' && data.templateContract?.source === 'uploaded'
    ? buildResumeTemplateCapabilityReport(data.templateContract)
    : null
  const uploadedExportBlocked = capabilityReport?.overall === 'blocked'

  const cancelPendingWork = useCallback(() => {
    requestRevisionRef.current += 1
    optimizationAbortRef.current?.abort()
    verificationAbortRef.current?.abort()
    optimizationAbortRef.current = null
    verificationAbortRef.current = null
  }, [])

  const handleClose = useCallback(() => {
    if (typeof window !== 'undefined' && (isDirty || busy)) {
      const message = busy
        ? 'Close the resume generator and cancel the operation currently in progress?'
        : 'Close the resume generator and discard your unsaved edits?'
      if (!window.confirm(message)) return
    }
    cancelPendingWork()
    onClose()
  }, [busy, cancelPendingWork, isDirty, onClose])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cancelPendingWork()
    }
  }, [cancelPendingWork])

  const handleCloseRef = useRef(handleClose)
  useEffect(() => {
    handleCloseRef.current = handleClose
  }, [handleClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'

    const getFocusable = () => dialogRef.current
      ? Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )).filter(element => element.offsetParent !== null)
      : []

    const focusFrame = window.requestAnimationFrame(() => {
      getFocusable()[0]?.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = getFocusable()
      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewData(data), 250)
    return () => window.clearTimeout(timer)
  }, [data])

  useEffect(() => {
    if (!draftKey) return
    const timer = window.setTimeout(() => {
      try {
        const saved = saveResumeDraft(draftKey, data, selectedTemplate)
        if (saved) {
          setDraftRecord(saved)
          setDraftStatus(`Saved ${new Date(saved.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
        }
      } catch (error) {
        setDraftStatus(error instanceof Error ? error.message : 'Draft save failed.')
      }
    }, 700)
    return () => window.clearTimeout(timer)
  }, [data, draftKey, selectedTemplate])

  const createVersion = useCallback(() => {
    if (!draftKey || busy) return
    try {
      const saved = createResumeDraftVersion(draftKey, data, selectedTemplate)
      if (saved) {
        setDraftRecord(saved)
        setDraftStatus('Version saved.')
      }
    } catch (error) {
      setDraftStatus(error instanceof Error ? error.message : 'Version save failed.')
    }
  }, [busy, data, draftKey, selectedTemplate])

  const restoreVersion = useCallback((version: ResumeDraftVersion) => {
    if (busy) return
    requestRevisionRef.current += 1
    optimizationAbortRef.current?.abort()
    verificationAbortRef.current?.abort()
    setData(version.data)
    setPreviewData(version.data)
    setSelectedTemplate(version.templateId)
    setOptimizationProposal(null)
    setOptimizationError(null)
    setPdfVerification(null)
    setPdfVerificationError(null)
    setIsDirty(true)
    setDraftStatus(`Restored ${version.label}.`)
    setShowVersions(false)
  }, [busy])

  const duplicateVersion = useCallback((versionId: string) => {
    if (!draftKey || busy) return
    const saved = duplicateResumeDraftVersion(draftKey, versionId)
    if (saved) {
      setDraftRecord(saved)
      setDraftStatus('Version duplicated.')
    }
  }, [busy, draftKey])

  const removeVersion = useCallback((versionId: string) => {
    if (!draftKey || busy) return
    const saved = deleteResumeDraftVersion(draftKey, versionId)
    if (saved) {
      setDraftRecord(saved)
      setDraftStatus('Version deleted.')
    }
  }, [busy, draftKey])

  const clearDraftHistory = useCallback(() => {
    if (!draftKey || busy || !window.confirm('Clear autosave and all local resume versions for this analysis?')) return
    clearResumeDraft(draftKey)
    setDraftRecord(null)
    setDraftStatus('Local history cleared.')
    setShowVersions(false)
  }, [busy, draftKey])
  
  // Create object URL for original resume
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!resumeFile) {
      const timer = window.setTimeout(() => setOriginalUrl(null), 0)
      return () => window.clearTimeout(timer)
    }

    const url = URL.createObjectURL(resumeFile)
    const timer = window.setTimeout(() => {
      if (mountedRef.current) setOriginalUrl(url)
    }, 0)

    return () => {
      window.clearTimeout(timer)
      URL.revokeObjectURL(url)
    }
  }, [resumeFile])

  const invalidatePdfVerification = useCallback(() => {
    setPdfVerification(null)
    setPdfVerificationError(null)
  }, [])

  const markEditorMutation = useCallback(() => {
    if (editingLocked) return false
    requestRevisionRef.current += 1
    setOptimizationProposal(null)
    setOptimizationError(null)
    invalidatePdfVerification()
    setIsDirty(true)
    return true
  }, [editingLocked, invalidatePdfVerification])

  const selectTemplate = (templateId: ResumeTemplateChoiceId) => {
    if (busy || templateId === selectedTemplate) return
    requestRevisionRef.current += 1
    setSelectedTemplate(templateId)
    setOptimizationProposal(null)
    setOptimizationError(null)
    invalidatePdfVerification()
    setIsDirty(true)
  }

  // Simple handlers
  const updateField = <K extends keyof ImprovedResumeData>(field: K, value: ImprovedResumeData[K]) => {
    if (!markEditorMutation()) return
    setData(prev => ({ ...prev, [field]: value }))
  }

  const updateIdentityField = (field: ResumeIdentityEvidenceField, value: string) => {
    if (!markEditorMutation()) return
    setData(prev => ({
      ...prev,
      [field]: value,
      identityEvidence: markResumeIdentityFieldAsUserEdited(prev, field),
    }))
  }

  const updateSectionText = (sectionIndex: number, text: string) => {
    const newSections = [...(data.sections || [])]
    const sec = newSections[sectionIndex]
    if (sec.type === 'text') {
      newSections[sectionIndex] = markSectionTextAsUserEdited({ ...sec, text })
      updateField('sections', newSections)
    }
  }

  const removeSectionListItem = (sectionIndex: number, itemIndex: number) => {
    const newSections = [...(data.sections || [])]
    const sec = newSections[sectionIndex]
    if (sec.type === 'list') {
      newSections[sectionIndex] = { ...sec, items: (sec.items || []).filter((_, i) => i !== itemIndex) }
      updateField('sections', newSections)
    }
  }

  const addSectionListItem = (e: React.KeyboardEvent<HTMLInputElement>, sectionIndex: number) => {
    const val = e.currentTarget.value.trim()
    if (e.key === 'Enter' && val) {
      e.preventDefault()
      const newSections = [...(data.sections || [])]
      const sec = newSections[sectionIndex]
      if (sec.type === 'list') {
        newSections[sectionIndex] = markListItemAsUserAdded(
          { ...sec, items: [...(sec.items || []), val] },
          val
        )
        updateField('sections', newSections)
      }
      e.currentTarget.value = ''
    }
  }

  const updateSectionEntry = (sectionIndex: number, entryIndex: number, field: ResumeEntryEvidenceField, value: string) => {
    const newSections = [...(data.sections || [])]
    const sec = newSections[sectionIndex]
    if (sec.type === 'entries') {
      const newEntries = [...(sec.entries || [])]
      newEntries[entryIndex] = { ...newEntries[entryIndex], [field]: value }
      newSections[sectionIndex] = markEntryFieldAsUserEdited({ ...sec, entries: newEntries }, entryIndex, field)
      updateField('sections', newSections)
    }
  }

  const updateSectionEntryBullets = (sectionIndex: number, entryIndex: number, bullets: string[]) => {
    const newSections = [...(data.sections || [])]
    const sec = newSections[sectionIndex]
    if (sec.type === 'entries') {
      const newEntries = [...(sec.entries || [])]
      newEntries[entryIndex] = { ...newEntries[entryIndex], bullets }
      newSections[sectionIndex] = markEntryBulletsAsUserEdited({ ...sec, entries: newEntries }, entryIndex)
      updateField('sections', newSections)
    }
  }

  const removeSectionEntry = (sectionIndex: number, entryIndex: number) => {
    const newSections = [...(data.sections || [])]
    const sec = newSections[sectionIndex]
    if (sec.type === 'entries') {
      newSections[sectionIndex] = { ...sec, entries: (sec.entries || []).filter((_, i) => i !== entryIndex) }
      updateField('sections', newSections)
    }
  }

  const addSectionEntry = (sectionIndex: number) => {
    const newSections = [...(data.sections || [])]
    const sec = newSections[sectionIndex]
    if (sec.type === 'entries') {
      newSections[sectionIndex] = { ...sec, entries: [...(sec.entries || []), { title: '' }] }
      updateField('sections', newSections)
    }
  }

  const updateSectionClassification = (sectionIndex: number, semanticType: ResumeSemanticSectionType) => {
    const newSections = [...(data.sections || [])]
    const section = newSections[sectionIndex]
    if (!section) return
    newSections[sectionIndex] = normalizeManualSectionClassification(section, semanticType)
    updateField('sections', newSections)
  }

  const moveSection = (sectionIndex: number, direction: -1 | 1) => {
    updateField('sections', reorderResumeSections(data.sections || [], sectionIndex, direction))
  }

  const restoreInitialAiSection = (group: ResumeChangeGroup) => {
    if (!markEditorMutation()) return
    setData(prev => ({
      ...prev,
      sections: restoreOriginalResumeSection(
        prev.sections || [],
        prev.originalSections || [],
        group.sectionTitle,
        group.semanticType
      ),
      improvementOperations: removeReviewedSectionOperations(
        prev.improvementOperations || [],
        group.sectionTitle,
        group.semanticType
      ),
    }))
  }

  const requestLayoutOptimization = async () => {
    if (busy) return
    if (selectedTemplate === 'uploaded') {
      setOptimizationError('Automatic AI shortening is disabled for Preserve Uploaded Layout. Edit the flagged region manually or allow another page so the original structure stays authoritative.')
      return
    }

    optimizationAbortRef.current?.abort()
    const controller = new AbortController()
    optimizationAbortRef.current = controller
    const requestRevision = requestRevisionRef.current
    const templateAtRequest = selectedTemplate

    setOptimizing(true)
    setOptimizationError(null)
    setOptimizationProposal(null)
    const finishPerformanceMeasure = startResumeWorkflowMeasure('optimization')

    try {
      const response = await fetch('/api/resume/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, templateId: templateAtRequest }),
        signal: controller.signal,
      })
      const payload = await readJsonObject(response)
      if (!response.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Could not optimize resume content')
      }
      if (
        !Array.isArray(payload.sections)
        || !Array.isArray(payload.operations)
        || !payload.before
        || typeof payload.before !== 'object'
        || !payload.after
        || typeof payload.after !== 'object'
      ) {
        throw new Error('The optimization service returned an incomplete proposal.')
      }
      if (
        controller.signal.aborted
        || !mountedRef.current
        || requestRevision !== requestRevisionRef.current
        || templateAtRequest !== selectedTemplate
      ) return

      if (payload.operations.length === 0) {
        setOptimizationError('No safe shortening was found. Keep two pages or edit the longest sections manually.')
        return
      }
      setOptimizationProposal(payload as unknown as ResumeOptimizationProposal)
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return
      if (mountedRef.current && requestRevision === requestRevisionRef.current) {
        setOptimizationError(error instanceof Error ? error.message : 'Could not optimize resume content')
      }
    } finally {
      finishPerformanceMeasure()
      if (optimizationAbortRef.current === controller) {
        optimizationAbortRef.current = null
        if (mountedRef.current) setOptimizing(false)
      }
    }
  }

  const applyLayoutOptimization = () => {
    if (!optimizationProposal || editingLocked) return
    const sections = optimizationProposal.sections
    requestRevisionRef.current += 1
    setOptimizationProposal(null)
    setOptimizationError(null)
    invalidatePdfVerification()
    setIsDirty(true)
    setData(prev => ({ ...prev, sections }))
  }

  const verifyAndDownloadPdf = async (blob: Blob | null, url: string | null) => {
    if (!blob || !url || busy || uploadedExportBlocked) return

    verificationAbortRef.current?.abort()
    const controller = new AbortController()
    verificationAbortRef.current = controller
    const requestRevision = requestRevisionRef.current
    const templateAtRequest = selectedTemplate

    setVerifyingPdf(true)
    setPdfVerificationError(null)
    setPdfVerification(null)
    const finishPerformanceMeasure = startResumeWorkflowMeasure('verification')

    try {
      const form = new FormData()
      form.append('pdf', blob, 'resume.pdf')
      form.append('data', JSON.stringify(data))
      form.append('templateId', templateAtRequest)

      const response = await fetch('/api/resume/verify-pdf', {
        method: 'POST',
        body: form,
        signal: controller.signal,
      })
      const payload = await readJsonObject(response)
      if (!response.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Could not verify the final PDF')
      }
      if (
        (payload.status !== 'verified' && payload.status !== 'failed')
        || typeof payload.actualPages !== 'number'
        || typeof payload.contentCoverage !== 'number'
        || !Array.isArray(payload.missingContent)
      ) {
        throw new Error('The PDF verification service returned an invalid result.')
      }
      if (
        controller.signal.aborted
        || !mountedRef.current
        || requestRevision !== requestRevisionRef.current
        || templateAtRequest !== selectedTemplate
      ) return

      const verification = payload as unknown as ResumeRenderVerificationResult
      setPdfVerification(verification)

      if (verification.status !== 'verified') {
        const missing = verification.missingContent.slice(0, 3).map(item => item.label).join(', ')
        setPdfVerificationError(
          missing
            ? `Download blocked because rendered content is missing: ${missing}.`
            : 'Download blocked because the rendered PDF did not pass content verification.'
        )
        return
      }

      const safeName = (data.name || 'Resume').trim().replace(/[^a-zA-Z0-9._-]+/g, '_') || 'Resume'
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${safeName}_Improved_Resume.pdf`
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setIsDirty(false)
      if (draftKey) {
        const saved = createResumeDraftVersion(draftKey, data, templateAtRequest, 'Verified download')
        if (saved) {
          setDraftRecord(saved)
          setDraftStatus('Verified download saved.')
        }
      }
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return
      if (mountedRef.current && requestRevision === requestRevisionRef.current) {
        setPdfVerificationError(error instanceof Error ? error.message : 'Could not verify the final PDF')
      }
    } finally {
      finishPerformanceMeasure()
      if (verificationAbortRef.current === controller) {
        verificationAbortRef.current = null
        if (mountedRef.current) setVerifyingPdf(false)
      }
    }
  }

  const renderSectionHeader = (section: DynamicSection, sectionIndex: number) => {
    const isSummary = getSectionSemanticType(section) === 'summary'
    return (
      <>
        <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{section.title}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <ResumeEvidenceBadge evidence={section.provenance?.section} />
            {!isSummary && (
              <>
                <button type="button" onClick={() => moveSection(sectionIndex, -1)} disabled={editingLocked || sectionIndex === 0} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Move ${section.title} up`} title="Move section up">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => moveSection(sectionIndex, 1)} disabled={editingLocked || sectionIndex >= (data.sections?.length ?? 0) - 1} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Move ${section.title} down`} title="Move section down">
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
        <SectionClassificationReview section={section} onChange={(semanticType) => updateSectionClassification(sectionIndex, semanticType)} />
      </>
    )
  }

  const renderIdentityLabel = (field: ResumeIdentityEvidenceField, label: string) => (
    <label className="text-xs font-semibold mb-1.5 flex items-center justify-between gap-2">
      <span>{label}</span>
      <ResumeEvidenceBadge evidence={data.identityEvidence?.[field]} compact />
    </label>
  )

  // Edit Panel Sections
  const renderEditPanel = () => (
    <fieldset disabled={editingLocked} aria-busy={busy} className="space-y-8 animate-in fade-in duration-300">
      {data.generationWarning && (
        <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-800">
          <p className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Original resume loaded safely</p>
          <p className="mt-1 text-amber-800/90">{data.generationWarning}</p>
        </div>
      )}
      <div className={`rounded-xl border p-4 space-y-2 ${preflight.fit === 'overflow-risk' ? 'border-red-500/30 bg-red-500/5' : preflight.fit === 'tight' ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
        {busy && (
          <div role="status" className="rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-[11px] text-blue-700">
            {optimizing ? 'Finding safe content optimizations. Editing is temporarily locked.' : 'Verifying the exact rendered PDF. Editing and template changes are temporarily locked.'}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Layout Preflight
          </h3>
          <span className="text-xs font-semibold">{preflight.score}/100 Â· ~{preflight.estimatedPages} page{preflight.estimatedPages === 1 ? '' : 's'}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {preflight.fit === 'comfortable' ? 'This template should fit comfortably with the current content.' : preflight.fit === 'tight' ? 'This template is getting dense. Review long sections before export.' : 'This template has overflow risk. Prefer another page, a better-fitting template, or content optimization instead of tiny text.'}
        </p>
        {pdfVerification && (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-700">
            <p className="font-semibold flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Render verified Â· {pdfVerification.actualPages} page{pdfVerification.actualPages === 1 ? '' : 's'} Â· {Math.round(pdfVerification.contentCoverage * 100)}% expected content present</p>
            {pdfVerification.templateFidelity && <p className="mt-1">Uploaded template fidelity: {pdfVerification.templateFidelity.score}%.</p>}
            {pdfVerification.pageDelta !== 0 && <p className="mt-1 text-amber-700">The real render differs from the heuristic estimate by {Math.abs(pdfVerification.pageDelta)} page{Math.abs(pdfVerification.pageDelta) === 1 ? '' : 's'}; the rendered count is authoritative.</p>}
          </div>
        )}
        {pdfVerificationError && <p className="text-xs text-red-600">{pdfVerificationError}</p>}
        {preflight.warnings.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-1 pl-5 list-disc">
            {preflight.warnings.slice(0, 3).map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.message}</li>)}
          </ul>
        )}

        {preflight.fit !== 'comfortable' && selectedTemplate !== 'uploaded' && !optimizationProposal && (
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={requestLayoutOptimization} disabled={busy} aria-busy={optimizing}>
              <Sparkles className="h-3.5 w-3.5" />
              {optimizing ? 'Finding safe shortening...' : 'Optimize for this template'}
            </Button>
            <span className="text-[10px] text-muted-foreground">Proposes shorter wording first; nothing is applied automatically.</span>
          </div>
        )}

        {selectedTemplate === 'uploaded' && capabilityReport && (
          <div className="space-y-2 pt-1">
            <p className="text-[10px] text-muted-foreground">Preserve Uploaded Layout uses region capacity and rendered verification. Content is never auto-shrunk below the detected readable font floor.</p>
            <div className={`rounded-lg border p-3 space-y-2 ${capabilityReport.overall === 'blocked' ? 'border-red-500/30 bg-red-500/5' : capabilityReport.overall === 'limited' ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold">Template fidelity capabilities</p>
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  {capabilityReport.overall === 'blocked' ? 'Export blocked' : capabilityReport.overall === 'limited' ? 'Verified with limits' : 'Fully supported'}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {capabilityReport.counts.preserved} preserved Â· {capabilityReport.counts.approximated} approximated Â· {capabilityReport.counts.unsupported} unsupported Â· {capabilityReport.counts.blocking} blocking
              </p>
              <div className="space-y-1.5">
                {capabilityReport.items.map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-3 text-[10px]">
                    <div className="min-w-0">
                      <p className="font-semibold">{item.label}</p>
                      <p className="text-muted-foreground leading-relaxed">{item.detail}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-semibold capitalize ${item.status === 'blocking' ? 'border-red-500/30 text-red-600' : item.status === 'unsupported' ? 'border-amber-500/30 text-amber-700' : item.status === 'approximated' ? 'border-blue-500/30 text-blue-700' : 'border-emerald-500/30 text-emerald-700'}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {optimizationError && <p className="text-xs text-amber-600">{optimizationError}</p>}

        {optimizationProposal && (
          <div className="mt-3 rounded-lg border border-blue-500/20 bg-background/70 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-blue-600">Optimization proposal</p>
                <p className="text-[10px] text-muted-foreground">Review every rewrite before applying it.</p>
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground">
                {optimizationProposal.before.score}/100 â†’ {optimizationProposal.after.score}/100 Â· ~{optimizationProposal.before.estimatedPages}p â†’ ~{optimizationProposal.after.estimatedPages}p
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {optimizationProposal.operations.map((operation, index) => (
                <div key={`${operation.target}-${index}`} className="rounded-md border border-border/50 p-2 text-[11px] space-y-1.5">
                  <p className="font-semibold">{operation.sectionTitle}</p>
                  <p className="text-muted-foreground line-through">{operation.before}</p>
                  <p>{operation.after}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setOptimizationProposal(null)} disabled={busy}>Keep current text</Button>
              <Button type="button" size="sm" onClick={applyLayoutOptimization} disabled={busy}>Apply proposal</Button>
            </div>
          </div>
        )}
      </div>

      <InitialResumeChangesReview
        operations={data.improvementOperations}
        originalSections={data.originalSections}
        onRestore={restoreInitialAiSection}
      />
      
      {/* AI Recommendations Sidebar/Banner */}
      {(data.recommendations || []).length > 0 && (
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2 text-blue-600">
            <Sparkles className="h-4 w-4" /> AI Recommendations
          </h3>
          <ul className="text-xs text-muted-foreground space-y-2 pl-6 list-disc">
            {(data.recommendations || []).map((rec, i) => <li key={i}>{rec}</li>)}
          </ul>
        </div>
      )}

      {/* Contact Info */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Contact Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            {renderIdentityLabel('name', 'Full Name')}
            <input className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm" value={data.name} onChange={e => updateIdentityField('name', e.target.value)} />
          </div>
          <div>
            {renderIdentityLabel('email', 'Email')}
            <input className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm" value={data.email} onChange={e => updateIdentityField('email', e.target.value)} />
          </div>
          <div>
            {renderIdentityLabel('phone', 'Phone')}
            <input className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm" value={data.phone} onChange={e => updateIdentityField('phone', e.target.value)} />
          </div>
          <div>
            {renderIdentityLabel('location', 'Location')}
            <input className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm" value={data.location ?? ''} onChange={e => updateIdentityField('location', e.target.value)} />
          </div>
          <div>
            {renderIdentityLabel('linkedin', 'LinkedIn')}
            <input className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm" value={data.linkedin} onChange={e => updateIdentityField('linkedin', e.target.value)} />
          </div>
          <div>
            {renderIdentityLabel('github', 'GitHub')}
            <input className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm" value={data.github} onChange={e => updateIdentityField('github', e.target.value)} />
          </div>
          <div>
            {renderIdentityLabel('website', 'Website / Portfolio')}
            <input className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm" value={data.website} onChange={e => updateIdentityField('website', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Dynamic Sections */}
      {(data.sections || []).map((section, sIndex) => {
        if (section.type === 'text') {
          return (
            <section key={sIndex} className="space-y-4 relative">
              {renderSectionHeader(section, sIndex)}
              <textarea 
                className="w-full px-3 py-2 bg-background border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] rounded-lg text-sm min-h-[100px] leading-relaxed resize-y" 
                value={section.text || ''} 
                onChange={e => updateSectionText(sIndex, e.target.value)} 
              />
            </section>
          )
        }
        
        if (section.type === 'list') {
          return (
            <section key={sIndex} className="space-y-4">
              {renderSectionHeader(section, sIndex)}
              <div className="flex flex-wrap gap-2">
                {(section.items || []).map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted border border-border/50 group">
                    {item}
                    <ResumeEvidenceBadge evidence={section.provenance?.items?.[normalizeResumeEvidenceKey(item)]} compact />
                    <button type="button" onClick={() => removeSectionListItem(sIndex, i)} className="text-muted-foreground hover:text-red-500 opacity-50 group-hover:opacity-100 transition-opacity" aria-label={`Remove ${item}`} title="Remove item"><X className="h-3 w-3"/></button>
                  </span>
                ))}
                <input 
                  type="text" 
                  placeholder="Type and press Enter to add..." 
                  className="px-2.5 py-1 text-xs bg-transparent border border-dashed border-border rounded-md focus:outline-none focus:border-primary w-48"
                  onKeyDown={(e) => addSectionListItem(e, sIndex)}
                />
              </div>
            </section>
          )
        }

        if (section.type === 'entries') {
          return (
            <section key={sIndex} className="space-y-4">
              {renderSectionHeader(section, sIndex)}
              <div className="space-y-4">
                {(section.entries || []).map((entry, i) => (
                  <div key={i} className={`p-4 rounded-xl border border-border/50 bg-card space-y-3 relative group ${entry.isEnhanced ? 'border-blue-500/30 bg-blue-500/5' : ''}`}>
                     <div className="pr-8 min-h-5"><ResumeEvidenceBadge evidence={collectEntryEvidence(entry)} compact /></div>
                     <button type="button" onClick={() => removeSectionEntry(sIndex, i)} className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100" aria-label={`Remove ${entry.title || section.title} entry`} title="Remove entry"><Trash2 className="h-4 w-4"/></button>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                       <div>
                         <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center justify-between gap-2"><span>Title / Role</span><ResumeEvidenceBadge evidence={entry.fieldEvidence?.title} compact /></label>
                         <input className="w-full px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm font-semibold" value={entry.title || ''} onChange={e => updateSectionEntry(sIndex, i, 'title', e.target.value)} />
                       </div>
                       <div>
                         <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center justify-between gap-2"><span>Subtitle / Company</span><ResumeEvidenceBadge evidence={entry.fieldEvidence?.subtitle} compact /></label>
                         <input className="w-full px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm" value={entry.subtitle || ''} onChange={e => updateSectionEntry(sIndex, i, 'subtitle', e.target.value)} />
                       </div>
                       <div>
                         <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center justify-between gap-2"><span>Dates</span><ResumeEvidenceBadge evidence={entry.fieldEvidence?.dates} compact /></label>
                         <input className="w-full px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm" value={entry.dates || ''} onChange={e => updateSectionEntry(sIndex, i, 'dates', e.target.value)} />
                       </div>
                       <div>
                         <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center justify-between gap-2"><span>Link URL</span><ResumeEvidenceBadge evidence={entry.fieldEvidence?.link} compact /></label>
                         <input className="w-full px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm" value={entry.link || ''} onChange={e => updateSectionEntry(sIndex, i, 'link', e.target.value)} />
                       </div>
                       <div className="sm:col-span-2">
                         <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center justify-between gap-2">
                           <span>Narrative Description (Optional)</span>
                           <ResumeEvidenceBadge evidence={entry.fieldEvidence?.description} compact />
                         </label>
                         <textarea className={`w-full px-2.5 py-1.5 bg-background border rounded-md text-sm min-h-[80px] resize-y ${entry.isEnhanced ? 'border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'border-border/50'}`} value={entry.description || ''} onChange={e => updateSectionEntry(sIndex, i, 'description', e.target.value)} />
                       </div>
                       <div className="sm:col-span-2 space-y-2">
                         <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between gap-2">
                           <span>Bullets</span>
                           <ResumeEvidenceBadge evidence={entry.bulletEvidence} compact />
                         </label>
                         {(entry.bullets || []).map((bullet, bulletIndex) => (
                           <div key={bulletIndex} className="flex items-center gap-2">
                             <span className="text-muted-foreground text-xs">â€¢</span>
                             <input
                               className="flex-1 px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm"
                               value={bullet}
                               onChange={e => {
                                 const bullets = [...(entry.bullets || [])]
                                 bullets[bulletIndex] = e.target.value
                                 updateSectionEntryBullets(sIndex, i, bullets)
                               }}
                             />
                             <button
                               type="button"
                               className="text-muted-foreground hover:text-red-500"
                               aria-label="Remove bullet"
                               onClick={() => updateSectionEntryBullets(sIndex, i, (entry.bullets || []).filter((_, index) => index !== bulletIndex))}
                             >
                               <X className="h-3.5 w-3.5" />
                             </button>
                           </div>
                         ))}
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           className="h-7 border-dashed text-[11px]"
                           onClick={() => updateSectionEntryBullets(sIndex, i, [...(entry.bullets || []), ''])}
                         >
                           <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Bullet
                         </Button>
                       </div>
                     </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => addSectionEntry(sIndex)}>
                   <Plus className="h-4 w-4 mr-2" /> Add Entry
                </Button>
              </div>
            </section>
          )
        }
        
        return null;
      })}

    </fieldset>
  )

  if (typeof document === 'undefined') return null

  // Template picker step
  if (step === 'pick-template') {
    return createPortal(
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="resume-generator-title" tabIndex={-1} className="fixed inset-0 z-[100] bg-background flex flex-col animate-in slide-in-from-bottom-8 duration-300">
        <div className="h-16 border-b border-border/50 flex items-center justify-between px-4 sm:px-6 shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <LayoutTemplate className="h-4 w-4 text-primary" />
            </div>
            <h2 id="resume-generator-title" className="text-lg font-bold">Improved Resume Generator</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={handleClose} className="rounded-full" aria-label="Close resume generator" title="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <ResumeTemplatePicker
            data={data}
            selected={selectedTemplate}
            onSelect={selectTemplate}
            onConfirm={() => setStep('edit')}
          />
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="resume-generator-title" tabIndex={-1} className="fixed inset-0 z-[100] bg-background flex flex-col animate-in slide-in-from-bottom-8 duration-300">
      
      {/* Header */}
      <div className="h-16 border-b border-border/50 flex items-center justify-between px-4 sm:px-6 shrink-0 bg-card">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 id="resume-generator-title" className="text-lg font-bold">Improved Resume Generator</h2>
            <p className="text-xs text-muted-foreground hidden sm:block">Edit your AI-enhanced content and download as an ATS-friendly PDF.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {draftKey && (
            <Button type="button" variant="outline" size="sm" className="hidden sm:flex gap-2 text-xs" onClick={() => setShowVersions(value => !value)} disabled={busy} aria-expanded={showVersions} aria-controls="resume-version-panel">
              <History className="h-3.5 w-3.5" /> Versions ({draftRecord?.versions.length ?? 0})
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="hidden sm:flex gap-2 text-xs" onClick={() => setCompareMode(!compareMode)} disabled={busy}>
            <Columns className="h-3.5 w-3.5" />
            {compareMode ? 'Exit Compare' : 'Compare PDFs'}
          </Button>
          <Button type="button" variant="outline" size="sm" className="hidden sm:flex gap-2 text-xs" onClick={() => setStep('pick-template')} disabled={busy}>
            <LayoutTemplate className="h-3.5 w-3.5" />
            Change Template
          </Button>
          <BlobProvider document={<ResumeTemplateChoiceRenderer data={data} templateId={selectedTemplate} />}>
            {({ blob, url, loading, error }) => (
              <Button
                size="sm"
                className="bg-primary text-primary-foreground font-bold shadow-md px-4 sm:px-6"
                disabled={loading || busy || !blob || !url || Boolean(error) || uploadedExportBlocked}
                aria-busy={loading || verifyingPdf}
                onClick={() => verifyAndDownloadPdf(blob, url)}
                title={uploadedExportBlocked ? 'Uploaded continuation-page artwork cannot be reproduced safely. Choose a built-in template for verified export.' : error ? 'Could not generate the PDF' : 'Verify the rendered PDF before downloading'}
              >
                {optimizing ? 'Optimizing...' : loading ? 'Generating...' : verifyingPdf ? 'Verifying...' : error ? 'Render unavailable' : <><Download className="h-4 w-4 mr-2" /> Download PDF</>}
              </Button>
            )}
          </BlobProvider>
          <Button type="button" variant="ghost" size="icon" onClick={handleClose} className="rounded-full" aria-label="Close resume generator" title="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {draftKey && showVersions && (
        <aside id="resume-version-panel" aria-label="Saved resume versions" className="absolute right-4 top-20 z-[120] w-[min(92vw,380px)] max-h-[70vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border/60 p-4">
            <div><h3 className="text-sm font-bold">Resume Versions</h3><p className="text-[11px] text-muted-foreground">{draftStatus ?? 'Autosave ready.'}</p></div>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowVersions(false)} aria-label="Close version history"><X className="h-4 w-4" /></Button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-3 space-y-2">
            {(draftRecord?.versions.length ?? 0) === 0 ? <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">No saved versions yet.</p> : draftRecord?.versions.map(version => (
              <div key={version.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <p className="text-xs font-bold">{version.label}</p>
                <p className="my-1 text-[10px] text-muted-foreground">{new Date(version.createdAt).toLocaleString()} · {version.templateId}</p>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => restoreVersion(version)} disabled={busy}>Restore</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => duplicateVersion(version.id)} disabled={busy} aria-label={`Duplicate ${version.label}`}><Copy className="h-3.5 w-3.5" /></Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeVersion(version.id)} disabled={busy} aria-label={`Delete ${version.label}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-border/60 p-3">
            <Button type="button" size="sm" onClick={createVersion} disabled={busy}><Save className="mr-1 h-3.5 w-3.5" />Save Current</Button>
            <Button type="button" size="sm" variant="ghost" onClick={clearDraftHistory} disabled={busy || !draftRecord} className="text-red-600">Clear History</Button>
          </div>
        </aside>
      )}

      {/* Mobile Tabs */}
      <div className="sm:hidden flex border-b border-border/50 shrink-0 overflow-x-auto">
         <button type="button" role="tab" aria-selected={activeTab === 'original'} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 ${activeTab === 'original' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} onClick={() => setActiveTab('original')}>Original</button>
         <button type="button" role="tab" aria-selected={activeTab === 'edit'} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 ${activeTab === 'edit' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} onClick={() => setActiveTab('edit')}>Edit Form</button>
         <button type="button" role="tab" aria-selected={activeTab === 'preview'} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 ${activeTab === 'preview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} onClick={() => setActiveTab('preview')}>Live Preview</button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
        
        {/* Panel 1: Original Resume (Hidden on mobile unless activeTab) */}
        <div className={`w-full ${compareMode ? 'sm:w-1/2' : 'sm:w-1/4'} h-full border-r border-border/50 bg-muted/20 flex-col ${activeTab === 'original' ? 'flex' : 'hidden sm:flex'}`}>
           <div className="p-3 border-b border-border/50 bg-card flex items-center justify-between shrink-0">
             <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4"/> Original Resume</span>
           </div>
           <div className="flex-1 p-4 overflow-hidden relative">
             {originalUrl ? (
               <iframe src={`${originalUrl}#toolbar=0&navpanes=0`} className="w-full h-full rounded-lg border border-border/50 shadow-sm bg-background" title="Original PDF" />
             ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                 <FileText className="h-8 w-8 opacity-20" />
                 <span className="text-xs">No original PDF provided</span>
               </div>
             )}
           </div>
        </div>

        {/* Panel 2: Edit Form */}
        <div className={`w-full sm:w-2/4 h-full border-r border-border/50 bg-background flex-col ${compareMode ? 'hidden' : (activeTab === 'edit' ? 'flex' : 'hidden sm:flex')}`}>
           <div className="p-3 border-b border-border/50 bg-card flex items-center justify-between shrink-0">
             <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Sparkles className="h-4 w-4"/> Edit Content</span>
           </div>
           <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-muted/5">
              {renderEditPanel()}
           </div>
        </div>

        {/* Panel 3: Live Preview */}
         <div className={`w-full ${compareMode ? 'sm:w-1/2' : 'sm:w-1/4'} h-full bg-muted/20 flex-col ${activeTab === 'preview' ? 'flex' : 'hidden sm:flex'}`}>
           <div className="p-3 border-b border-border/50 bg-card flex items-center justify-between shrink-0">
             <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Eye className="h-4 w-4"/> Live PDF Preview</span>
             <Badge variant="secondary" className={`text-[10px] gap-1 ${preflight.fit === 'overflow-risk' ? 'bg-red-500/10 text-red-600 border-red-500/20' : preflight.fit === 'tight' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-green-500/10 text-green-600 border-green-500/20'}`}><CheckCircle2 className="h-3 w-3"/> {preflight.fit === 'comfortable' ? 'Fits comfortably' : preflight.fit === 'tight' ? 'Tight layout' : 'Overflow risk'} Â· ~{preflight.estimatedPages}p</Badge>
           </div>
           <div className="flex-1 p-4 overflow-hidden relative flex flex-col items-center justify-center">
             <BlobProvider document={<ResumeTemplateChoiceRenderer data={previewData} templateId={selectedTemplate} />}>
               {({ url, loading, error }) => {
                 try {
                   if (error) {
                     return <div className="text-red-500 text-xs flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Error rendering PDF preview.</div>
                   }
                   if (loading || !url) {
                     return <div className="text-muted-foreground text-xs animate-pulse">Updating live preview...</div>
                   }
                   return (
                     <iframe src={`${url}#toolbar=0&navpanes=0&view=FitH`} className="w-full h-full rounded-lg border border-border/50 shadow-sm bg-background animate-in fade-in duration-500" title="Live Preview PDF" />
                   )
                 } catch {
                   return <div className="text-red-500 text-xs flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Error rendering PDF preview.</div>
                 }
               }}
             </BlobProvider>
           </div>
         </div>

      </div>
    </div>,
    document.body
  )
}
