import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET(req: NextRequest) {
  if (!(await isToolLive('p', 'beachhouse'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const res = await watsonFetch(`/api/p/beachhouse/states?${req.nextUrl.searchParams.toString()}`, {
    headers: { 'X-Watson-Key': process.env.BEACHHOUSE_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Search failed' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
