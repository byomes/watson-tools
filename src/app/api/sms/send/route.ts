import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: Request) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : undefined
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const mediaBase64 = typeof body?.media_base64 === 'string' ? body.media_base64 : undefined
  const mediaType = typeof body?.media_type === 'string' ? body.media_type : undefined
  if (!phone || (!text && !mediaBase64)) {
    return NextResponse.json({ error: 'phone and (text or media_base64) are required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/sms/send', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify({ phone, name, text, media_base64: mediaBase64, media_type: mediaType }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json({ error: data?.error || 'Failed to send' }, { status: res.status === 400 ? 400 : 502 })
  }
  return NextResponse.json(data, { status: 201 })
}
