import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: Request) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const text = (body.text || '').trim()
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/sms/spellcheck', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Spellcheck failed' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
