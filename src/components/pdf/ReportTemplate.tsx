'use client'

import React, { forwardRef } from 'react'
import type { AISummaryResult, AIMismatch } from '@/types'

interface ReportTemplateProps {
  result: AISummaryResult
  mismatches?: AIMismatch[]
  userName?: string
}

export const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateProps>(
  ({ result, mismatches, userName }, ref) => {
    return (
      <div
        ref={ref}
        className="bg-white text-black p-10 font-sans"
        style={{
          width: '794px', // A4 width at 96 DPI
          minHeight: '1123px', // A4 height at 96 DPI
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          zIndex: -1,
        }}
      >
        <div className="border-b-2 border-gray-200 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Pilot Review Report</h1>
            <p className="text-gray-500 mt-1">AI-Powered Technical Assessment</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Overall Score</p>
            <p className="text-4xl font-black text-indigo-600">{result.normalFeedback?.overallScore ?? result.overallScore}/100</p>
          </div>
        </div>

        {userName && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800">Candidate: {userName}</h2>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">Executive Summary</h2>
          <p className="text-gray-700 leading-relaxed">{result.normalFeedback?.summary ?? result.summary}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 text-emerald-600">Key Strengths</h2>
            <ul className="space-y-3">
              {(result.normalFeedback?.topStrengths ?? result.topStrengths).map((s, i) => (
                <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 text-red-600">Areas for Improvement</h2>
            <ul className="space-y-3">
              {(result.deepFeedback?.topWeaknesses ?? result.topWeaknesses).map((w, i) => (
                <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span> {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 text-blue-600">Actionable Recommendations</h2>
          <ul className="space-y-3">
            {(result.deepFeedback?.topRecommendations ?? result.topRecommendations).map((r, i) => (
              <li key={i} className="text-gray-700 text-sm flex items-start gap-3">
                <span className="text-white bg-blue-600 font-bold px-2 py-0.5 rounded text-xs">{i + 1}</span> {r}
              </li>
            ))}
          </ul>
        </div>

        {mismatches && mismatches.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 text-orange-600">Cross-Reference Discrepancies</h2>
            <ul className="space-y-3">
              {mismatches.map((m, i) => (
                <li key={i} className="text-gray-700 text-sm flex items-start gap-2">
                  <span className="text-orange-500 font-bold">[!]</span> {m.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-400">
          Generated automatically by Pilot Review Platform.
        </div>
      </div>
    )
  }
)

ReportTemplate.displayName = 'ReportTemplate'
