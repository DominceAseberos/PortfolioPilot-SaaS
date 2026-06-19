import React, { useState, useEffect } from 'react'
import { X, Download, Eye, FileText, CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2, Sparkles, AlertTriangle } from 'lucide-react'
import { BlobProvider, PDFDownloadLink } from '@react-pdf/renderer'
import { ImprovedResumeTemplate, ImprovedResumeData } from '@/components/pdf/ImprovedResumeTemplate'
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
  
  // Create object URL for original resume
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  useEffect(() => {
    if (resumeFile) {
      const url = URL.createObjectURL(resumeFile)
      setOriginalUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [resumeFile])

  // Simple handlers
  const updateField = (field: keyof ImprovedResumeData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const updateWorkEntry = (index: number, field: string, value: string) => {
    const newEntries = [...data.workEntries]
    newEntries[index] = { ...newEntries[index], [field]: value }
    updateField('workEntries', newEntries)
  }

  const updateProject = (index: number, field: string, value: string) => {
    const newProjects = [...data.projects]
    newProjects[index] = { ...newProjects[index], [field]: value }
    updateField('projects', newProjects)
  }

  const updateEducation = (index: number, field: string, value: string) => {
    const newEdu = [...data.education]
    newEdu[index] = { ...newEdu[index], [field]: value }
    updateField('education', newEdu)
  }

  const removeSkill = (index: number) => {
    updateField('skills', data.skills.filter((_, i) => i !== index))
  }

  const addSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      e.preventDefault()
      const newSkill = e.currentTarget.value.trim()
      if (!data.skills.includes(newSkill)) {
        updateField('skills', [...data.skills, newSkill])
      }
      e.currentTarget.value = ''
    }
  }

  // Edit Panel Sections
  const renderEditPanel = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* AI Recommendations Sidebar/Banner */}
      {data.recommendations.length > 0 && (
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2 text-blue-600">
            <Sparkles className="h-4 w-4" /> AI Recommendations
          </h3>
          <ul className="text-xs text-muted-foreground space-y-2 pl-6 list-disc">
            {data.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
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

      {/* Professional Summary */}
      <section className="space-y-4 relative">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Professional Summary</h3>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] gap-1"><Sparkles className="h-3 w-3"/> AI Generated</Badge>
        </div>
        <textarea 
          className="w-full px-3 py-2 bg-background border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] rounded-lg text-sm min-h-[100px] leading-relaxed resize-y" 
          value={data.summary} 
          onChange={e => updateField('summary', e.target.value)} 
        />
      </section>

      {/* Skills */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {data.skills.map((skill, i) => {
            const isInitial = initialData.skills.includes(skill)
            const isNew = !initialData.skills.includes(skill) && i >= (initialData.skills.length - 5) // roughly guess which are from GitHub based on initial setup
            // Actually, we passed them all in initialData. Let's just say any skill in initialData that wasn't in original resume (which we don't have direct access to here, but we can assume the last ones might be). 
            // We won't colorize perfectly here unless we passed originalSkills vs newSkills, but let's just make it editable.
            return (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted border border-border/50 group">
                {skill}
                <button type="button" onClick={() => removeSkill(i)} className="text-muted-foreground hover:text-red-500 opacity-50 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3"/></button>
              </span>
            )
          })}
          <input 
            type="text" 
            placeholder="Type and press Enter to add..." 
            className="px-2.5 py-1 text-xs bg-transparent border border-dashed border-border rounded-md focus:outline-none focus:border-primary w-48"
            onKeyDown={addSkill}
          />
        </div>
      </section>

      {/* Experience */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
           <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Experience</h3>
        </div>
        <div className="space-y-4">
          {data.workEntries.map((work, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/50 bg-card space-y-3 relative group">
               <button type="button" onClick={() => updateField('workEntries', data.workEntries.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4"/></button>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                 <div>
                   <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Role</label>
                   <input className="w-full px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm font-semibold" value={work.role} onChange={e => updateWorkEntry(i, 'role', e.target.value)} />
                 </div>
                 <div>
                   <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Company</label>
                   <input className="w-full px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm" value={work.company} onChange={e => updateWorkEntry(i, 'company', e.target.value)} />
                 </div>
                 <div className="sm:col-span-2">
                   <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Dates</label>
                   <input className="w-full px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm" value={work.dates} onChange={e => updateWorkEntry(i, 'dates', e.target.value)} />
                 </div>
                 <div className="sm:col-span-2">
                   <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block flex items-center justify-between">
                     Description
                     {work.isEnhanced && <span className="text-blue-500 flex items-center gap-1"><Sparkles className="h-3 w-3"/> AI Enhanced</span>}
                   </label>
                   <textarea className={`w-full px-2.5 py-1.5 bg-background border rounded-md text-sm min-h-[80px] resize-y ${work.isEnhanced ? 'border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'border-border/50'}`} value={work.description} onChange={e => updateWorkEntry(i, 'description', e.target.value)} />
                 </div>
               </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => updateField('workEntries', [...data.workEntries, { role: '', company: '', dates: '', description: '' }])}>
             <Plus className="h-4 w-4 mr-2" /> Add Experience
          </Button>
        </div>
      </section>

      {/* Projects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
           <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Projects</h3>
        </div>
        <div className="space-y-4">
          {data.projects.map((proj, i) => (
            <div key={i} className={`p-4 rounded-xl border space-y-3 relative group ${proj.isNew ? 'border-green-500/30 bg-green-500/5' : 'border-border/50 bg-card'}`}>
               <button type="button" onClick={() => updateField('projects', data.projects.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4"/></button>
               {proj.isNew && <Badge variant="outline" className="absolute -top-2.5 left-4 bg-background text-green-600 border-green-500/30 text-[10px] uppercase">Added from GitHub</Badge>}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                 <div>
                   <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Project Name</label>
                   <input className="w-full px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm font-semibold" value={proj.name} onChange={e => updateProject(i, 'name', e.target.value)} />
                 </div>
                 <div>
                   <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Link URL</label>
                   <input className="w-full px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm" value={proj.link} onChange={e => updateProject(i, 'link', e.target.value)} />
                 </div>
                 <div className="sm:col-span-2">
                   <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Description</label>
                   <textarea className="w-full px-2.5 py-1.5 bg-background border border-border/50 rounded-md text-sm min-h-[60px] resize-y" value={proj.description} onChange={e => updateProject(i, 'description', e.target.value)} />
                 </div>
               </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => updateField('projects', [...data.projects, { name: '', link: '', description: '' }])}>
             <Plus className="h-4 w-4 mr-2" /> Add Project
          </Button>
        </div>
      </section>

    </div>
  )

  return (
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
          <PDFDownloadLink 
            document={<ImprovedResumeTemplate data={data} />} 
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
        <div className={`w-full sm:w-1/4 h-full border-r border-border/50 bg-muted/20 flex flex-col ${activeTab !== 'original' && 'hidden sm:flex'}`}>
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
        <div className={`w-full sm:w-2/4 h-full border-r border-border/50 bg-background flex flex-col ${activeTab !== 'edit' && 'hidden sm:flex'}`}>
           <div className="p-3 border-b border-border/50 bg-card flex items-center justify-between shrink-0">
             <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Sparkles className="h-4 w-4"/> Edit Content</span>
           </div>
           <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-muted/5">
              {renderEditPanel()}
           </div>
        </div>

        {/* Panel 3: Live Preview */}
        <div className={`w-full sm:w-1/4 h-full bg-muted/20 flex flex-col ${activeTab !== 'preview' && 'hidden sm:flex'}`}>
           <div className="p-3 border-b border-border/50 bg-card flex items-center justify-between shrink-0">
             <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Eye className="h-4 w-4"/> Live PDF Preview</span>
             <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20 gap-1"><CheckCircle2 className="h-3 w-3"/> ATS Friendly</Badge>
           </div>
           <div className="flex-1 p-4 overflow-hidden relative flex flex-col items-center justify-center">
             <BlobProvider document={<ImprovedResumeTemplate data={data} />}>
               {({ blob, url, loading, error }) => {
                 if (error) {
                   return <div className="text-red-500 text-xs flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Error rendering PDF preview.</div>
                 }
                 if (loading || !url) {
                   return <div className="text-muted-foreground text-xs animate-pulse">Updating live preview...</div>
                 }
                 return (
                   <iframe src={`${url}#toolbar=0&navpanes=0&view=FitH`} className="w-full h-full rounded-lg border border-border/50 shadow-sm bg-background animate-in fade-in duration-500" title="Live Preview PDF" />
                 )
               }}
             </BlobProvider>
           </div>
        </div>

      </div>
    </div>
  )
}
