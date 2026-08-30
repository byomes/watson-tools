import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'attendance'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const memberId = Number(data.member_id)
  const serviceDate = String(data.service_date ?? '')
  const present = Boolean(data.present)
  const campus = String(data.campus ?? '')

  if (!Number.isInteger(memberId)) {
    return NextResponse.json({ error: 'member_id is required' }, { status: 400 })
  }
  if (!serviceDate) {
    return NextResponse.json({ error: 'service_date is required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/cat/attendance/toggle', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.ATTENDANCE_API_KEY ?? '' },
    body: JSON.stringify({ member_id: memberId, service_date: serviceDate, present, campus }),
  })

  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
