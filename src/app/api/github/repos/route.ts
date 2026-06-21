import { NextRequest, NextResponse } from 'next/server'
import { normalizeGitHubUsername } from '@/utils/source-normalizers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawUsername = searchParams.get('username')

    if (!rawUsername) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const username = normalizeGitHubUsername(rawUsername)
    
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'PortfolioPilot',
    }
    
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=30&sort=updated&direction=desc`, { 
      headers, 
      signal: AbortSignal.timeout(5000) 
    })

    if (!res.ok) {
      if (res.status === 404) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      return NextResponse.json({ error: 'GitHub API error' }, { status: 502 })
    }

    const reposData = await res.json()
    
    const repos = (reposData as Array<{
      name: string; 
      description: string | null; 
      language: string | null;
      stargazers_count: number;
      updated_at: string;
      fork: boolean;
    }>)
    // Filter out forks by default to keep the list clean with original work
    .filter(r => !r.fork)
    .map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      updated_at: r.updated_at,
    }))

    return NextResponse.json({ repos })
  } catch (error) {
    console.error('Fetch github repos error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
