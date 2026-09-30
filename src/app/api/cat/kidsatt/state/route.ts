import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET(req: NextRequest) {
  // Page-only gating doesn't protect this route — it stays directly
  // fetchable by anyone who knows the URL unless it checks isToolLive() too.
  if (!(await isToolLive('cat', 'kidsatt'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const date = req.nextUrl.searchParams.get('date') ?? ''
  const res = await watsonFetch(`/api/cat/kidsatt/state?date=${encodeURIComponent(date)}`, {
    headers: { 'X-Watson-Key': process.env.KIDS_ATTENDANCE_API_KEY ?? '' },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load kids attendance' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
