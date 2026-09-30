import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET(req: NextRequest) {
  if (!(await isToolLive('cat', 'kidstoday'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const res = await watsonFetch(`/api/cat/kidstoday/search?q=${encodeURIComponent(q)}`, {
    headers: { 'X-Watson-Key': process.env.KIDS_SERVANTS_API_KEY ?? '' },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Search failed' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
