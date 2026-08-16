'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
  onClose: () => void
}

interface State {
  hasError: boolean
}

export class ResumeWorkflowErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Resume workflow render failure', {
      error: error.message,
      componentStack: info.componentStack,
    })
  }

  private retry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/95 p-6" role="alert">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-500/10 p-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold">Resume editor recovered from an error</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your source analysis is still available. Retry the editor, or close it and generate the resume again.
              </p>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={this.props.onClose}>
              <X className="mr-2 h-4 w-4" /> Close
            </Button>
            <Button type="button" onClick={this.retry}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry editor
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
