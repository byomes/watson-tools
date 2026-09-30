import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'kidsatt'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const kidId = Number(data.kid_id)
  const serviceDate = String(data.service_date ?? '')

  if (!Number.isInteger(kidId)) {
    return NextResponse.json({ error: 'kid_id is required' }, { status: 400 })
  }
  if (!serviceDate) {
    return NextResponse.json({ error: 'service_date is required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/cat/kidsatt/remove', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.KIDS_ATTENDANCE_API_KEY ?? '' },
    body: JSON.stringify({ kid_id: kidId, service_date: serviceDate }),
  })

  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
