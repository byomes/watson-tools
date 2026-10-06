import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET(req: NextRequest) {
  if (!(await isToolLive('cat', 'groups'))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const name = req.nextUrl.searchParams.get('name') ?? ''
  const res = await watsonFetch(`/api/cat/groups/lookup?name=${encodeURIComponent(name)}`, { headers: { 'X-Watson-Key': process.env.GROUPS_API_KEY ?? '' } })
  if (!res.ok) return NextResponse.json({ error: 'Lookup failed' }, { status: 502 })
  return NextResponse.json(await res.json())
}
