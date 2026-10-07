import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET(req: NextRequest) {
  if (!(await isToolLive('cat', 'servants'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const memberId = Number(req.nextUrl.searchParams.get('member_id'))
  if (!Number.isInteger(memberId)) {
    return NextResponse.json({ error: 'member_id is required' }, { status: 400 })
  }
  const res = await watsonFetch(`/api/cat/servants/awards?member_id=${memberId}`, {
    headers: { 'X-Watson-Key': process.env.SERVANTS_API_KEY ?? '' },
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'servants'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const memberId = Number(data.member_id)
  const label = String(data.label ?? '').trim()
  const status = String(data.status ?? '').trim()
  if (!Number.isInteger(memberId) || !label || !status) {
    return NextResponse.json({ error: 'member_id, label and status are required' }, { status: 400 })
  }
  const res = await watsonFetch('/api/cat/servants/awards', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.SERVANTS_API_KEY ?? '' },
    body: JSON.stringify({ member_id: memberId, label, status }),
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
