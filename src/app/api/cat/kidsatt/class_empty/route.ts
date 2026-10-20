import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'kidsatt'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const serviceDate = String(data.service_date ?? '')
  const className = String(data.class_name ?? '')
  if (!serviceDate || !className) {
    return NextResponse.json({ error: 'service_date and class_name are required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/cat/kidsatt/class_empty', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.KIDS_ATTENDANCE_API_KEY ?? '' },
    body: JSON.stringify({ service_date: serviceDate, class_name: className, empty: Boolean(data.empty) }),
  })

  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
