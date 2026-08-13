'use client'
import React from 'react'
import { BlobProvider } from '@react-pdf/renderer'
import { CheckCircle2, ArrowRight, Sparkles, FileUp } from 'lucide-react'
import {
  RESUME_TEMPLATES,
  type ResumeTemplateChoiceId,
  ResumeTemplateChoiceRenderer,
} from '@/components/pdf/ImprovedResumeTemplate'
import type { ImprovedResumeData } from '@/components/pdf/ImprovedResumeTemplate'
import { recommendResumeTemplate } from '@/features/resume/services/resume-template-recommendation.service'
import { analyzeUploadedTemplatePreflight } from '@/features/resume/services/resume-template-layout-plan.service'
import { Button } from '@/components/common/Button'

interface ResumeTemplatePickerProps {
  data: ImprovedResumeData
  selected: ResumeTemplateChoiceId
  onSelect: (id: ResumeTemplateChoiceId) => void
  onConfirm: () => void
}

interface TemplateOption {
  id: ResumeTemplateChoiceId
  name: string
  description: string
  tags: string[]
  accentColor: string
  fit: 'comfortable' | 'tight' | 'overflow-risk'
  estimatedPages: number
  recommended: boolean
  uploaded: boolean
}

function TemplateMiniPreview({ data, templateId }: { data: ImprovedResumeData; templateId: ResumeTemplateChoiceId }) {
  return (
    <BlobProvider document={<ResumeTemplateChoiceRenderer data={data} templateId={templateId} />}>
      {({ url, loading }) => {
        if (loading || !url) {
          return (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )
        }
        return (
          <iframe
            src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            className="w-full h-full rounded pointer-events-none"
            title={`${templateId} template preview`}
          />
        )
      }}
    </BlobProvider>
  )
}

export function ResumeTemplatePicker({ data, selected, onSelect, onConfirm }: ResumeTemplatePickerProps) {
  const recommendation = recommendResumeTemplate(data)
  const recommendedTemplate = RESUME_TEMPLATES.find((template) => template.id === recommendation.templateId)
  const uploadedContract = data.templateContract?.source === 'uploaded' ? data.templateContract : null
  const uploadedPreflight = uploadedContract ? analyzeUploadedTemplatePreflight(data, uploadedContract) : null

  const options: TemplateOption[] = [
    ...(uploadedContract && uploadedPreflight ? [{
      id: 'uploaded' as const,
      name: 'Preserve Uploaded Layout',
      description: 'Rebuild the resume using the detected columns, section regions, widths, ordering, and readable font floor from your uploaded PDF.',
      tags: ['Source Layout', `${uploadedContract.columnCount} Column${uploadedContract.columnCount === 1 ? '' : 's'}`, 'Geometry Verified'],
      accentColor: '#0f766e',
      fit: uploadedPreflight.fit,
      estimatedPages: uploadedPreflight.estimatedPages,
      recommended: false,
      uploaded: true,
    }] : []),
    ...RESUME_TEMPLATES.map((template) => {
      const preflight = recommendation.preflights[template.id]
      return {
        id: template.id,
        name: template.name,
        description: template.description,
        tags: template.tags,
        accentColor: template.accentColor,
        fit: preflight.fit,
        estimatedPages: preflight.estimatedPages,
        recommended: recommendation.templateId === template.id,
        uploaded: false,
      }
    }),
  ]

  const selectedOption = options.find((option) => option.id === selected)

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4 border-b border-border/50 bg-card shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold">Choose Your Resume Template</h2>
        </div>
        <p className="text-xs text-muted-foreground ml-11">
          Recommended built-in: <span className="font-semibold text-foreground">{recommendedTemplate?.name}</span>. {recommendation.reason}
          {uploadedContract && <span> You can also preserve the detected structure of your uploaded resume.</span>}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${uploadedContract ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-5 max-w-7xl mx-auto`}>
          {options.map((option) => {
            const isSelected = selected === option.id
            const fitLabel = option.fit === 'comfortable' ? 'Comfortable fit' : option.fit === 'tight' ? 'Tight fit' : 'Overflow risk'
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                className={`relative flex flex-col rounded-2xl border-2 overflow-hidden text-left transition-all duration-200 group focus:outline-none ${
                  isSelected
                    ? 'border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)] scale-[1.02]'
                    : 'border-border/50 hover:border-primary/40 hover:shadow-lg hover:scale-[1.01]'
                }`}
              >
                <div className="w-full aspect-[3/4] bg-muted/30 relative overflow-hidden">
                  <TemplateMiniPreview data={data} templateId={option.id} />
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/5 flex items-start justify-end p-3">
                      <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-card flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    {option.uploaded ? (
                      <FileUp className="h-3.5 w-3.5" style={{ color: option.accentColor }} />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-border/50" style={{ backgroundColor: option.accentColor }} />
                    )}
                    <h3 className="font-bold text-sm">{option.name}</h3>
                    {option.recommended && (
                      <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">Recommended</span>
                    )}
                    {option.uploaded && (
                      <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">Your PDF</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{option.description}</p>
                  <div className="mb-3 flex items-center justify-between gap-2 text-[10px] font-semibold">
                    <span className={option.fit === 'overflow-risk' ? 'text-red-500' : option.fit === 'tight' ? 'text-amber-500' : 'text-emerald-600'}>{fitLabel}</span>
                    <span className="text-muted-foreground">~{option.estimatedPages} page{option.estimatedPages === 1 ? '' : 's'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {option.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: `${option.accentColor}18`,
                          color: option.accentColor,
                          border: `1px solid ${option.accentColor}30`,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-5 border-t border-border/50 bg-card shrink-0 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Selected: <span className="font-semibold text-foreground">{selectedOption?.name ?? 'Template'}</span>
        </p>
        <Button onClick={onConfirm} className="bg-primary text-primary-foreground font-bold px-6 gap-2">
          Edit Content
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
