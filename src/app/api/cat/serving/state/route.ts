import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET(req: NextRequest) {
  if (!(await isToolLive('cat', 'serving'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const date = req.nextUrl.searchParams.get('date') ?? ''
  const res = await watsonFetch(`/api/cat/serving/state?date=${encodeURIComponent(date)}`, {
    headers: { 'X-Watson-Key': process.env.SERVANTS_API_KEY ?? '' },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load serving attendance' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
