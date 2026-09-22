import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'serving'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const memberId = Number(data.member_id)
  const teamName = String(data.team_name ?? '').trim()
  const serviceDate = String(data.service_date ?? '')
  const served = Boolean(data.served)

  if (!Number.isInteger(memberId)) {
    return NextResponse.json({ error: 'member_id is required' }, { status: 400 })
  }
  if (!teamName) return NextResponse.json({ error: 'team_name is required' }, { status: 400 })
  if (!serviceDate) return NextResponse.json({ error: 'service_date is required' }, { status: 400 })

  const res = await watsonFetch('/api/cat/serving/toggle', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.SERVANTS_API_KEY ?? '' },
    body: JSON.stringify({ member_id: memberId, team_name: teamName, service_date: serviceDate, served }),
  })

  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
