import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'servants'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const name = String(data.name ?? '').trim()
  const teamName = String(data.team_name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!teamName) return NextResponse.json({ error: 'team_name is required' }, { status: 400 })

  const res = await watsonFetch('/api/cat/servants/add', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.SERVANTS_API_KEY ?? '' },
    body: JSON.stringify({
      name,
      team_name: teamName,
      position: data.position ? String(data.position).trim() : undefined,
      started_serving_date: data.started_serving_date ? String(data.started_serving_date).trim() : undefined,
      member_id: data.member_id != null ? Number(data.member_id) : undefined,
      create_new: Boolean(data.create_new),
    }),
  })

  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
