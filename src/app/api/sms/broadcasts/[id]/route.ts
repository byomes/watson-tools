import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const res = await watsonFetch(`/api/sms/broadcasts/${id}`, {
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json({ error: data?.error || 'Failed to load broadcast' }, { status: res.status === 404 ? 404 : 502 })
  }
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const res = await watsonFetch(`/api/sms/broadcasts/${id}`, {
    method: 'DELETE',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json({ error: data?.error || 'Failed to cancel broadcast' }, { status: res.status === 409 ? 409 : 502 })
  }
  return NextResponse.json(data)
}
