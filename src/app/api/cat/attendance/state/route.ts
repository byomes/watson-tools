import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET(req: NextRequest) {
  // Page-only gating doesn't protect this route — it stays directly
  // fetchable by anyone who knows the URL unless it checks isToolLive() too.
  if (!(await isToolLive('cat', 'attendance'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const date = req.nextUrl.searchParams.get('date') ?? ''
  const res = await watsonFetch(`/api/cat/attendance/state?date=${encodeURIComponent(date)}`, {
    headers: { 'X-Watson-Key': process.env.ATTENDANCE_API_KEY ?? '' },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load attendance' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
