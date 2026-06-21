import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateImprovedResumeContent } from '@/features/ai/services/ai.service'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { originalSections, missingSkills, missingProjects } = body

    if (!originalSections) {
      return NextResponse.json({ error: 'Missing originalSections' }, { status: 400 })
    }

    const enhancedSections = await generateImprovedResumeContent(
      originalSections,
      missingSkills || [],
      missingProjects || []
    )

    return NextResponse.json({ sections: enhancedSections })
  } catch (error) {
    console.error('Error in /api/resume/improve:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
