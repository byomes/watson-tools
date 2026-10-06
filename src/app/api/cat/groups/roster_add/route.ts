import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'groups'))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const res = await watsonFetch('/api/cat/groups/roster_add', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.GROUPS_API_KEY ?? '' },
    body: JSON.stringify(data),
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
