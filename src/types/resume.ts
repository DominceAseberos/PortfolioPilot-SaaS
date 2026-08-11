export type ResumeSemanticSectionType =
  | 'summary'
  | 'skills'
  | 'experience'
  | 'education'
  | 'projects'
  | 'certifications'
  | 'licenses'
  | 'awards'
  | 'languages'
  | 'volunteer'
  | 'publications'
  | 'training'
  | 'custom'
  | 'unknown'

export interface DynamicSection {
  title: string;                 // The EXACT header from the original PDF
  type: 'text' | 'list' | 'entries';
  semanticType?: ResumeSemanticSectionType; // Profession-agnostic meaning assigned by extraction/classification
  classificationConfidence?: number; // 0..1; low confidence stays reviewable instead of being guessed
  manualOrder?: number; // User-controlled order within a template-compatible region
  text?: string;
  items?: string[];
  entries?: {
    title: string;
    subtitle?: string;
    dates?: string;
    description?: string;
    link?: string;
    isEnhanced?: boolean;        // Identifies AI-injected items
  }[];
  acceptsAIImprovements: boolean; // Safe-lock to allow GitHub data injection
}

export interface ImprovedResumeData {
  name: string
  email: string
  phone: string
  linkedin: string
  github: string
  website: string
  
  // Dynamic structure
  sections: DynamicSection[]
  
  // Legacy fields (kept optional for backward compatibility during transition)
  summary?: string
  skills?: string[]
  workEntries?: {
    company: string
    role: string
    dates: string
    description: string
    isEnhanced?: boolean
  }[]
  projects?: {
    name: string
    link: string
    description: string
    isNew?: boolean
  }[]
  education?: {
    degree: string
    school: string
    dates: string
  }[]
  recommendations?: string[]
}
