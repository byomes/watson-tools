import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const sendAt = typeof body?.send_at === 'string' ? body.send_at : ''
  if (!text || !sendAt) {
    return NextResponse.json({ error: 'text and send_at are required' }, { status: 400 })
  }

  const res = await watsonFetch(`/api/sms/scheduled/${id}`, {
    method: 'PUT',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify({ text, send_at: sendAt }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json({ error: data?.error || 'Failed to update scheduled message' }, { status: res.status === 400 ? 400 : 502 })
  }
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const res = await watsonFetch(`/api/sms/scheduled/${id}`, {
    method: 'DELETE',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to cancel scheduled message' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
