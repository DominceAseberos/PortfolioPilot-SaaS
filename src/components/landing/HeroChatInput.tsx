'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, FileText, GitBranch, Globe, Plus, Send, Check } from 'lucide-react'

type InputType = 'portfolio' | 'github' | 'resume'

export function HeroChatInput() {
  const router = useRouter()
  const [inputType, setInputType] = useState<InputType>('resume')
  const [inputValue, setInputValue] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (inputType === 'resume') {
      router.push('/dashboard/reviews')
      return
    }

    if (!inputValue) return
    
    const params = new URLSearchParams()
    if (inputType === 'portfolio') params.set('portfolio', inputValue)
    if (inputType === 'github') params.set('github', inputValue)
    
    router.push(`/dashboard/reviews?${params.toString()}`)
  }

  const getPlaceholder = () => {
    switch (inputType) {
      case 'portfolio': return 'Analyze your portfolio URL...'
      case 'github': return 'Analyze your GitHub username...'
      case 'resume': return 'Upload your resume first...'
    }
  }

  const getIcon = () => {
    switch (inputType) {
      case 'portfolio': return <Globe className="h-4 w-4 mr-2" />
      case 'github': return <GitBranch className="h-4 w-4 mr-2" />
      case 'resume': return <FileText className="h-4 w-4 mr-2" />
    }
  }

  return (
    <div className="relative max-w-2xl mx-auto mt-10">
      <form 
        onSubmit={handleSubmit}
        className="flex items-center gap-2 bg-card text-foreground rounded-[2rem] p-2 pl-4 pr-3 shadow-xl border border-border/50 transition-all hover:border-border focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10"
      >
        <button 
          type="button" 
          onClick={() => router.push('/dashboard/reviews')}
          className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-6 w-6" />
        </button>

        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={getPlaceholder()}
          readOnly={inputType === 'resume'}
          onClick={() => {
            if (inputType === 'resume') router.push('/dashboard/reviews')
          }}
          className={`flex-1 bg-transparent border-none outline-none text-base placeholder:text-muted-foreground/60 focus:ring-0 px-2 ${
            inputType === 'resume' ? 'cursor-pointer' : ''
          }`}
        />

        <div className="relative" ref={dropdownRef}>
          <button 
            type="button" 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center bg-muted/50 hover:bg-muted transition-colors px-4 py-2.5 rounded-[1.5rem] text-sm font-medium border border-transparent hover:border-border/50"
          >
            {getIcon()}
            <span className="capitalize hidden sm:inline">{inputType}</span>
            <ChevronDown className="h-4 w-4 ml-2 text-muted-foreground" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50 py-2">
              <div className="px-3 pb-2 pt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Analysis Source
              </div>
              {(['portfolio', 'github', 'resume'] as InputType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setInputType(type)
                    setIsDropdownOpen(false)
                    setInputValue('')
                  }}
                  className={`w-full flex items-center px-4 py-2.5 text-sm hover:bg-muted transition-colors ${
                    inputType === type ? 'text-primary bg-primary/5' : 'text-foreground'
                  }`}
                >
                  <div className="w-6 flex justify-center mr-2">
                    {inputType === type ? <Check className="h-4 w-4" /> : null}
                  </div>
                  {type === 'portfolio' && <Globe className="h-4 w-4 mr-3 text-blue-500" />}
                  {type === 'github' && <GitBranch className="h-4 w-4 mr-3 text-purple-500" />}
                  {type === 'resume' && <FileText className="h-4 w-4 mr-3 text-emerald-500" />}
                  <span className="capitalize">{type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={!inputValue && inputType !== 'resume'}
          className={`p-2.5 rounded-full transition-all ${
            inputValue || inputType === 'resume' ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted bg-transparent'
          }`}
        >
          <Send className="h-5 w-5" />
        </button>
      </form>

      <p className="text-muted-foreground mt-4 text-xs font-medium text-center">
        No credit card required. Free plan includes 1 review per month.
      </p>
    </div>
  )
}
