import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Context) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const { id } = await params
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'Invalid contact' }, { status: 400 })
  const body = await req.json().catch(() => null)
  const res = await watsonFetch(`/api/sms/contacts/own/${id}`, {
    method: 'PATCH',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(_req: Request, { params }: Context) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const { id } = await params
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'Invalid contact' }, { status: 400 })
  const res = await watsonFetch(`/api/sms/contacts/own/${id}`, {
    method: 'DELETE',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
  })
  if (res.status === 204) return new Response(null, { status: 204 })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
