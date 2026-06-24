import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const path = formData.get('path') as string | null

    if (!file || !path) {
      return new NextResponse('Missing file or path', { status: 400 })
    }

    if (!path.startsWith(`${user.id}/`)) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Bypass RLS using service role key
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const buffer = Buffer.from(await file.arrayBuffer())

    const { data, error } = await adminSupabase.storage
      .from('resumes')
      .upload(path, buffer, {
        upsert: true,
        contentType: 'application/pdf',
      })

    if (error) {
      console.error('Storage upload error:', error)
      return new NextResponse(error.message, { status: 500 })
    }

    return NextResponse.json({ success: true, path: data.path })
  } catch (error) {
    console.error('Resume upload error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
