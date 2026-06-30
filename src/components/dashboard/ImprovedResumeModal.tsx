import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, Eye, FileText, CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2, Sparkles, AlertTriangle, LayoutTemplate, Columns } from 'lucide-react'
import { BlobProvider, PDFDownloadLink } from '@react-pdf/renderer'
import { ImprovedResumeData, ResumeTemplateId, ResumeTemplateRenderer } from '@/components/pdf/ImprovedResumeTemplate'
import { ResumeTemplatePicker } from '@/components/dashboard/ResumeTemplatePicker'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'

export interface ImprovedResumeModalProps {
  initialData: ImprovedResumeData
  resumeFile: File | null
  onClose: () => void
}

export default function ImprovedResumeModal({ initialData, resumeFile, onClose }: ImprovedResumeModalProps) {
  const [data, setData] = useState<ImprovedResumeData>(initialData)
  const [activeTab, setActiveTab] = useState<'original' | 'edit' | 'preview'>('edit')
  const [step, setStep] = useState<'pick-template' | 'edit'>('pick-template')
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateId>('classic')
  const [compareMode, setCompareMode] = useState(false)
  
  // Create object URL for original resume
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  useEffect(() => {
    if (resumeFile) {
      const url = URL.createObjectURL(resumeFile)
      setTimeout(() => setOriginalUrl(url), 0)
      return () => URL.revokeObjectURL(url)
    }
  }, [resumeFile])

  // Simple handlers
  const updateField = <K extends keyof ImprovedResumeData>(field: K, value: ImprovedResumeData[K]) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const updateSectionText = (sectionIndex: number, text: string) => {
    const newSections = [...(data.sections || [])]
    const sec = newSections[sectionIndex]
    if (sec.type === 'text') {
      newSections[sectionIndex] = { ...sec, text }
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
        newSections[sectionIndex] = { ...sec, items: [...(sec.items || []), val] }
        updateField('sections', newSections)
      }
      e.currentTarget.value = ''
    }
  }

  const updateSectionEntry = (sectionIndex: number, entryIndex: number, field: string, value: string) => {
    const newSections = [...(data.sections || [])]
    const sec = newSections[sectionIndex]
    if (sec.type === 'entries') {
      const newEntries = [...(sec.entries || [])]
      newEntries[entryIndex] = { ...newEntries[entryIndex], [field]: value }
      newSections[sectionIndex] = { ...sec, entries: newEntries }
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

  // Edit Panel Sections
  const renderEditPanel = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      
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
            <label className="text-xs font-semibold mb-1.5 block">Full Name</label>
            <input className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm" value={data.name} onChange={e => updateField('name', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block">Email</label>
            <input className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm" value={data.email} onChange={e => updateField('email', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block">Phone</label>
            <input className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm" value={data.phone} onChange={e => updateField('phone', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block">LinkedIn</label>
            <input className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm" value={data.linkedin} onChange={e => updateField('linkedin', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block">GitHub</label>
            <input className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm" value={data.github} onChange={e => updateField('github', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block">Website / Portfolio</label>
            <input className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-sm" value={data.website} onChange={e => updateField('website', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Dynamic Sections */}
      {(data.sections || []).map((section, sIndex) => {
        if (section.type === 'text') {
          return (
            <section key={sIndex} className="space-y-4 relative">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{section.title}</h3>
                {section.acceptsAIImprovements && <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] gap-1"><Sparkles className="h-3 w-3"/> AI Generated</Badge>}
              </div>
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
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{section.title}</h3>
                {section.acceptsAIImprovements && <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] gap-1"><Sparkles className="h-3 w-3"/> AI Generated</Badge>}
              </div>
              <div className="flex flex-wrap gap-2">
                {(section.items || []).map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted border border-border/50 group">
                    {item}
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
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                 <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{section.title}</h3>
                 {section.acceptsAIImprovements && <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] gap-1"><Sparkles className="h-3 w-3"/> AI Generated</Badge>}
              </div>
              <div className="space-y-4">
                {(section.entries || []).map((entry, i) => (
                  <div key={i} className={`p-4 rounded-xl border border-border/50 bg-card space-y-3 relative group ${entry.isEnhanced ? 'border-blue-500/30 bg-blue-500/5' : ''}`}>
                     <button type="button" onClick={() => removeSectionEntry(sIndex, i)} className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4"/></button>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                       <div>
                         <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Title / Role</label>
                         <input className="w-full px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm font-semibold" value={entry.title || ''} onChange={e => updateSectionEntry(sIndex, i, 'title', e.target.value)} />
                       </div>
                       <div>
                         <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Subtitle / Company</label>
                         <input className="w-full px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm" value={entry.subtitle || ''} onChange={e => updateSectionEntry(sIndex, i, 'subtitle', e.target.value)} />
                       </div>
                       <div>
                         <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Dates</label>
                         <input className="w-full px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm" value={entry.dates || ''} onChange={e => updateSectionEntry(sIndex, i, 'dates', e.target.value)} />
                       </div>
                       <div>
                         <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Link URL</label>
                         <input className="w-full px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm" value={entry.link || ''} onChange={e => updateSectionEntry(sIndex, i, 'link', e.target.value)} />
                       </div>
                       <div className="sm:col-span-2">
                         <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block flex items-center justify-between">
                           Description
                           {entry.isEnhanced && <span className="text-blue-500 flex items-center gap-1"><Sparkles className="h-3 w-3"/> AI Enhanced</span>}
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
             <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20 gap-1"><CheckCircle2 className="h-3 w-3"/> ATS Friendly</Badge>
           </div>
           <div className="flex-1 p-4 overflow-hidden relative flex flex-col items-center justify-center">
             <BlobProvider document={<ResumeTemplateRenderer data={data} templateId={selectedTemplate} />}>
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
