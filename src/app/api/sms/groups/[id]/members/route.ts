import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const res = await watsonFetch(`/api/sms/groups/${id}/members`, {
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json({ error: data?.error || 'Failed to load group members' }, { status: res.status === 404 ? 404 : 502 })
  }
  return NextResponse.json(data)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
  if (!phone) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 })
  }

  const res = await watsonFetch(`/api/sms/groups/${id}/members`, {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify({
      phone,
      name: typeof body?.name === 'string' ? body.name : undefined,
      member_id: body?.member_id,
      mode: body?.mode === 'exclude' ? 'exclude' : 'include',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json({ error: data?.error || 'Failed to add group member' }, { status: res.status === 400 ? 400 : 502 })
  }
  return NextResponse.json(data, { status: 201 })
}
