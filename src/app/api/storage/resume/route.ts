import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return new NextResponse('Missing path parameter', { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Security: Ensure users can only download their own resumes
    if (!path.startsWith(`${user.id}/`)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { data, error } = await supabase.storage.from('resumes').download(path)

    if (error || !data) {
      return new NextResponse('File not found', { status: 404 })
    }

    const buffer = await data.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="resume.pdf"`,
      },
    })
  } catch (error) {
    console.error('Secure resume stream error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
