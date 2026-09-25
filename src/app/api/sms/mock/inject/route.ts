import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

// Dev-only helper -- lets the UI simulate an inbound text landing so the
// whole app is testable before real hardware exists. The Watson backend
// itself also refuses this route unless GATEWAY_MODE=mock, so this is
// belt-and-suspenders, not the only gate.
export async function POST(req: Request) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : undefined
  if (!phone || !text) {
    return NextResponse.json({ error: 'phone and text are required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/sms/mock/inject', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify({ phone, text, name }),
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Mock inject failed' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
