import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    // Validation is allowed for guests, so we don't return 401 if !session
    const { username } = await req.json()

    if (!username) {
      return NextResponse.json({ success: false, message: 'GitHub username is required' }, { status: 400 })
    }

    // Clean username (in case they pasted a URL instead of just the username)
    let cleanUsername = username.trim()
    if (cleanUsername.includes('github.com/')) {
       cleanUsername = cleanUsername.split('github.com/')[1].split('/')[0]
    }

    const headers: Record<string, string> = {
      'User-Agent': 'PortfolioPilot-Validation-Agent',
      'Accept': 'application/vnd.github.v3+json'
    }
    
    // Use token if available to avoid strict rate limits (5,000 req/hr vs 60 req/hr)
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
    }

    const response = await fetch(`https://api.github.com/users/${cleanUsername}`, { headers })

    if (response.status === 404) {
      return NextResponse.json({ success: false, message: 'GitHub user not found. Please check the username.' })
    }

    if (!response.ok) {
      throw new Error('GitHub API error')
    }

    const data = await response.json()

    // Block Organizations
    if (data.type === 'Organization') {
      return NextResponse.json({ success: false, message: 'This is an Organization profile. Please provide a personal developer profile.' })
    }

    return NextResponse.json({
      success: true,
      data: {
        login: data.login,
        name: data.name || data.login,
        avatarUrl: data.avatar_url,
        bio: data.bio,
        publicRepos: data.public_repos,
        followers: data.followers
      }
    })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred while verifying the GitHub profile.' },
      { status: 500 }
    )
  }
}
