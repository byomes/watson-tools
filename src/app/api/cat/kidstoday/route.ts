import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

// Page-only gating doesn't protect this route -- it stays directly
// fetchable by anyone who knows the URL unless it checks isToolLive() too.
export async function GET(req: NextRequest) {
  if (!(await isToolLive('cat', 'kidstoday'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const date = req.nextUrl.searchParams.get('date') ?? ''
  const res = await watsonFetch(`/api/cat/kidstoday/state?date=${encodeURIComponent(date)}`, {
    headers: { 'X-Watson-Key': process.env.KIDS_SERVANTS_API_KEY ?? '' },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load servants' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'kidstoday'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const res = await watsonFetch('/api/cat/kidstoday/save', {
    method: 'POST',
    headers: {
      'X-Watson-Key': process.env.KIDS_SERVANTS_API_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: text || 'Failed to save' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
