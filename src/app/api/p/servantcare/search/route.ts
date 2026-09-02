import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET(req: NextRequest) {
  if (!(await isToolLive('p', 'servantcare'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const res = await watsonFetch(`/api/p/servantcare/search?${req.nextUrl.searchParams.toString()}`, {
    headers: { 'X-Watson-Key': process.env.SERVANTCARE_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Search failed' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
