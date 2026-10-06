import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET(req: NextRequest) {
  if (!(await isToolLive('cat', 'groups'))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const p = req.nextUrl.searchParams
  const qs = new URLSearchParams({ series: p.get('series') ?? '', date: p.get('date') ?? '' })
  const res = await watsonFetch(`/api/cat/groups/state?${qs}`, { headers: { 'X-Watson-Key': process.env.GROUPS_API_KEY ?? '' } })
  if (!res.ok) return NextResponse.json({ error: 'Failed to load group attendance' }, { status: 502 })
  return NextResponse.json(await res.json())
}
