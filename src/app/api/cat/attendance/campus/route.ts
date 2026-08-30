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
  const campusPreference = String(data.campus_preference ?? '')

  if (!Number.isInteger(memberId)) {
    return NextResponse.json({ error: 'member_id is required' }, { status: 400 })
  }
  if (!campusPreference) {
    return NextResponse.json({ error: 'campus_preference is required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/cat/attendance/campus', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.ATTENDANCE_API_KEY ?? '' },
    body: JSON.stringify({ member_id: memberId, campus_preference: campusPreference }),
  })

  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
