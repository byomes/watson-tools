import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: Request) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  // See src/app/api/sms/send/route.ts -- same `recipients` passthrough for
  // a group text's first (scheduled) message.
  const recipients = Array.isArray(body?.recipients)
    ? body.recipients
        .map((r: unknown) => ({
          phone: typeof (r as { phone?: unknown })?.phone === 'string' ? (r as { phone: string }).phone : '',
          name: typeof (r as { name?: unknown })?.name === 'string' ? (r as { name: string }).name : undefined,
        }))
        .filter((r: { phone: string }) => r.phone)
    : undefined
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : undefined
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const sendAt = typeof body?.send_at === 'string' ? body.send_at : ''
  if ((!phone && !recipients?.length) || !text || !sendAt) {
    return NextResponse.json({ error: 'phone (or recipients), text, and send_at are required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/sms/schedule', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify(recipients?.length ? { recipients, text, send_at: sendAt } : { phone, name, text, send_at: sendAt }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json({ error: data?.error || 'Failed to schedule message' }, { status: res.status === 400 ? 400 : 502 })
  }
  return NextResponse.json(data, { status: 201 })
}
