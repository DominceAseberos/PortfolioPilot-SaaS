import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, Eye, FileText, CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2, Sparkles, AlertTriangle, LayoutTemplate, Columns } from 'lucide-react'
import { BlobProvider, PDFDownloadLink } from '@react-pdf/renderer'
import { ImprovedResumeData, ResumeTemplateId, ResumeTemplateRenderer } from '@/components/pdf/ImprovedResumeTemplate'
import { ResumeTemplatePicker } from '@/components/dashboard/ResumeTemplatePicker'
import { SectionClassificationReview } from '@/components/dashboard/SectionClassificationReview'
import { ResumeEvidenceBadge } from '@/components/dashboard/ResumeEvidenceBadge'
import { InitialResumeChangesReview } from '@/components/dashboard/InitialResumeChangesReview'
import { analyzeResumePreflight, type ResumePreflightResult } from '@/features/resume/services/resume-layout.service'
import type { ResumeChangeOperation } from '@/features/resume/services/resume-diff.service'
import { getSectionSemanticType, reorderResumeSections } from '@/features/resume/services/resume-template-allocation.service'
import { recommendResumeTemplate } from '@/features/resume/services/resume-template-recommendation.service'
import { normalizeManualSectionClassification } from '@/features/resume/services/resume-section-classification.service'
import {
  collectEntryEvidence,
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

export interface ImprovedResumeModalProps {
  initialData: ImprovedResumeData
  resumeFile: File | null
  onClose: () => void
}

interface ResumeOptimizationProposal {
  sections: DynamicSection[]
  operations: ResumeChangeOperation[]
  before: ResumePreflightResult
  after: ResumePreflightResult
}

export default function ImprovedResumeModal({ initialData, resumeFile, onClose }: ImprovedResumeModalProps) {
  const [data, setData] = useState<ImprovedResumeData>(initialData)
  const [activeTab, setActiveTab] = useState<'original' | 'edit' | 'preview'>('edit')
  const [step, setStep] = useState<'pick-template' | 'edit'>('pick-template')
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateId>(() => recommendResumeTemplate(initialData).templateId)
  const [compareMode, setCompareMode] = useState(false)
  const [previewData, setPreviewData] = useState<ImprovedResumeData>(initialData)
  const [optimizationProposal, setOptimizationProposal] = useState<ResumeOptimizationProposal | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const [optimizationError, setOptimizationError] = useState<string | null>(null)
  const preflight = analyzeResumePreflight(data, selectedTemplate)

  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewData(data), 250)
    return () => window.clearTimeout(timer)
  }, [data])
  
  // Create object URL for original resume
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  useEffect(() => {
    if (resumeFile) {
      const url = URL.createObjectURL(resumeFile)
      setTimeout(() => setOriginalUrl(url), 0)
      return () => URL.revokeObjectURL(url)
    }
  }, [resumeFile])

  useEffect(() => {
    setOptimizationProposal(null)
    setOptimizationError(null)
  }, [selectedTemplate])

  // Simple handlers
  const updateField = <K extends keyof ImprovedResumeData>(field: K, value: ImprovedResumeData[K]) => {
    setOptimizationProposal(null)
    setOptimizationError(null)
    setData(prev => ({ ...prev, [field]: value }))
  }

  const updateIdentityField = (field: ResumeIdentityEvidenceField, value: string) => {
    setOptimizationProposal(null)
    setOptimizationError(null)
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
    setOptimizationProposal(null)
    setOptimizationError(null)
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
    setOptimizing(true)
    setOptimizationError(null)
    setOptimizationProposal(null)
    try {
      const response = await fetch('/api/resume/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, templateId: selectedTemplate }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Could not optimize resume content')
      if (!Array.isArray(payload.operations) || payload.operations.length === 0) {
        setOptimizationError('No safe shortening was found. Keep two pages or edit the longest sections manually.')
        return
      }
      setOptimizationProposal(payload as ResumeOptimizationProposal)
    } catch (error) {
      setOptimizationError(error instanceof Error ? error.message : 'Could not optimize resume content')
    } finally {
      setOptimizing(false)
    }
  }

  const applyLayoutOptimization = () => {
    if (!optimizationProposal) return
    const sections = optimizationProposal.sections
    setOptimizationProposal(null)
    setOptimizationError(null)
    setData(prev => ({ ...prev, sections }))
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
                <button type="button" onClick={() => moveSection(sectionIndex, -1)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Move ${section.title} up`} title="Move section up">
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => moveSection(sectionIndex, 1)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Move ${section.title} down`} title="Move section down">
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
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className={`rounded-xl border p-4 space-y-2 ${preflight.fit === 'overflow-risk' ? 'border-red-500/30 bg-red-500/5' : preflight.fit === 'tight' ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Layout Preflight
          </h3>
          <span className="text-xs font-semibold">{preflight.score}/100 · ~{preflight.estimatedPages} page{preflight.estimatedPages === 1 ? '' : 's'}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {preflight.fit === 'comfortable' ? 'This template should fit comfortably with the current content.' : preflight.fit === 'tight' ? 'This template is getting dense. Review long sections before export.' : 'This template has overflow risk. Prefer another page, a better-fitting template, or content optimization instead of tiny text.'}
        </p>
        {preflight.warnings.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-1 pl-5 list-disc">
            {preflight.warnings.slice(0, 3).map((warning, index) => <li key={`${warning.code}-${index}`}>{warning.message}</li>)}
          </ul>
        )}

        {preflight.fit !== 'comfortable' && !optimizationProposal && (
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={requestLayoutOptimization} disabled={optimizing}>
              <Sparkles className="h-3.5 w-3.5" />
              {optimizing ? 'Finding safe shortening...' : 'Optimize for this template'}
            </Button>
            <span className="text-[10px] text-muted-foreground">Proposes shorter wording first; nothing is applied automatically.</span>
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
                {optimizationProposal.before.score}/100 → {optimizationProposal.after.score}/100 · ~{optimizationProposal.before.estimatedPages}p → ~{optimizationProposal.after.estimatedPages}p
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
              <Button type="button" size="sm" variant="ghost" onClick={() => setOptimizationProposal(null)}>Keep current text</Button>
              <Button type="button" size="sm" onClick={applyLayoutOptimization}>Apply proposal</Button>
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
                    <button type="button" onClick={() => removeSectionListItem(sIndex, i)} className="text-muted-foreground hover:text-red-500 opacity-50 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3"/></button>
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
                     <button type="button" onClick={() => removeSectionEntry(sIndex, i)} className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4"/></button>
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
                           <span>Description</span>
                           <ResumeEvidenceBadge evidence={entry.fieldEvidence?.description} compact />
                         </label>
                         <textarea className={`w-full px-2.5 py-1.5 bg-background border rounded-md text-sm min-h-[80px] resize-y ${entry.isEnhanced ? 'border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'border-border/50'}`} value={entry.description || ''} onChange={e => updateSectionEntry(sIndex, i, 'description', e.target.value)} />
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

    </div>
  )

  if (typeof document === 'undefined') return null

  // Template picker step
  if (step === 'pick-template') {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-in slide-in-from-bottom-8 duration-300">
        <div className="h-16 border-b border-border/50 flex items-center justify-between px-4 sm:px-6 shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <LayoutTemplate className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-bold">Improved Resume Generator</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <ResumeTemplatePicker
            data={data}
            selected={selectedTemplate}
            onSelect={setSelectedTemplate}
            onConfirm={() => setStep('edit')}
          />
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-in slide-in-from-bottom-8 duration-300">
      
      {/* Header */}
      <div className="h-16 border-b border-border/50 flex items-center justify-between px-4 sm:px-6 shrink-0 bg-card">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Improved Resume Generator</h2>
            <p className="text-xs text-muted-foreground hidden sm:block">Edit your AI-enhanced content and download as an ATS-friendly PDF.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="outline" size="sm" className="hidden sm:flex gap-2 text-xs" onClick={() => setCompareMode(!compareMode)}>
            <Columns className="h-3.5 w-3.5" />
            {compareMode ? 'Exit Compare' : 'Compare PDFs'}
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex gap-2 text-xs" onClick={() => setStep('pick-template')}>
            <LayoutTemplate className="h-3.5 w-3.5" />
            Change Template
          </Button>
          <PDFDownloadLink 
            document={<ResumeTemplateRenderer data={data} templateId={selectedTemplate} />} 
            fileName={`${data.name.replace(/\s+/g, '_')}_Improved_Resume.pdf`}
          >
            {({ loading }) => (
              <Button size="sm" className="bg-primary text-primary-foreground font-bold shadow-md px-4 sm:px-6" disabled={loading}>
                {loading ? 'Generating...' : <><Download className="h-4 w-4 mr-2" /> Download PDF</>}
              </Button>
            )}
          </PDFDownloadLink>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="sm:hidden flex border-b border-border/50 shrink-0 overflow-x-auto">
         <button className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 ${activeTab === 'original' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} onClick={() => setActiveTab('original')}>Original</button>
         <button className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 ${activeTab === 'edit' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} onClick={() => setActiveTab('edit')}>Edit Form</button>
         <button className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 ${activeTab === 'preview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} onClick={() => setActiveTab('preview')}>Live Preview</button>
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
             <Badge variant="secondary" className={`text-[10px] gap-1 ${preflight.fit === 'overflow-risk' ? 'bg-red-500/10 text-red-600 border-red-500/20' : preflight.fit === 'tight' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-green-500/10 text-green-600 border-green-500/20'}`}><CheckCircle2 className="h-3 w-3"/> {preflight.fit === 'comfortable' ? 'Fits comfortably' : preflight.fit === 'tight' ? 'Tight layout' : 'Overflow risk'} · ~{preflight.estimatedPages}p</Badge>
           </div>
           <div className="flex-1 p-4 overflow-hidden relative flex flex-col items-center justify-center">
             <BlobProvider document={<ResumeTemplateRenderer data={previewData} templateId={selectedTemplate} />}>
               {({ blob, url, loading, error }) => {
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
                 } catch (err: unknown) {
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
