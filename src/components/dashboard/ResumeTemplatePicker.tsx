'use client'
import React, { useState } from 'react'
import { BlobProvider } from '@react-pdf/renderer'
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'
import { RESUME_TEMPLATES, ResumeTemplateId, ResumeTemplateRenderer } from '@/components/pdf/ImprovedResumeTemplate'
import type { ImprovedResumeData } from '@/components/pdf/ImprovedResumeTemplate'
import { analyzeResumePreflight } from '@/features/resume/services/resume-layout.service'
import { Button } from '@/components/common/Button'

interface ResumeTemplatePickerProps {
  data: ImprovedResumeData
  selected: ResumeTemplateId
  onSelect: (id: ResumeTemplateId) => void
  onConfirm: () => void
}

function TemplateMiniPreview({ data, templateId }: { data: ImprovedResumeData; templateId: ResumeTemplateId }) {
  return (
    <BlobProvider document={<ResumeTemplateRenderer data={data} templateId={templateId} />}>
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
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border/50 bg-card shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold">Choose Your Resume Template</h2>
        </div>
        <p className="text-xs text-muted-foreground ml-11">Pick a style that best fits your target role. You can edit all content in the next step.</p>
      </div>

      {/* Template cards */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {RESUME_TEMPLATES.map((template) => {
            const isSelected = selected === template.id
            const preflight = analyzeResumePreflight(data, template.id)
            const fitLabel = preflight.fit === 'comfortable' ? 'Comfortable fit' : preflight.fit === 'tight' ? 'Tight fit' : 'Overflow risk'
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelect(template.id)}
                className={`relative flex flex-col rounded-2xl border-2 overflow-hidden text-left transition-all duration-200 group focus:outline-none ${
                  isSelected
                    ? 'border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)] scale-[1.02]'
                    : 'border-border/50 hover:border-primary/40 hover:shadow-lg hover:scale-[1.01]'
                }`}
              >
                {/* Live PDF preview */}
                <div className="w-full aspect-[3/4] bg-muted/30 relative overflow-hidden">
                  <TemplateMiniPreview data={data} templateId={template.id} />
                  {/* Selected overlay check */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/5 flex items-start justify-end p-3">
                      <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Template info */}
                <div className="p-4 bg-card flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="h-3 w-3 rounded-full border border-border/50"
                      style={{ backgroundColor: template.accentColor }}
                    />
                    <h3 className="font-bold text-sm">{template.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{template.description}</p>
                  <div className="mb-3 flex items-center justify-between gap-2 text-[10px] font-semibold">
                    <span className={preflight.fit === 'overflow-risk' ? 'text-red-500' : preflight.fit === 'tight' ? 'text-amber-500' : 'text-emerald-600'}>{fitLabel}</span>
                    <span className="text-muted-foreground">~{preflight.estimatedPages} page{preflight.estimatedPages === 1 ? '' : 's'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: `${template.accentColor}18`,
                          color: template.accentColor,
                          border: `1px solid ${template.accentColor}30`,
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

      {/* Footer CTA */}
      <div className="p-5 border-t border-border/50 bg-card shrink-0 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Selected: <span className="font-semibold text-foreground">{RESUME_TEMPLATES.find(t => t.id === selected)?.name}</span> template
        </p>
        <Button
          onClick={onConfirm}
          className="bg-primary text-primary-foreground font-bold px-6 gap-2"
        >
          Edit Content
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
