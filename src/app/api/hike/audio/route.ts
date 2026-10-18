import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: Request) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  if (typeof body?.audio_base64 !== 'string' || !body.audio_base64) {
    return NextResponse.json({ error: 'audio_base64 is required' }, { status: 400 })
  }
  const res = await watsonFetch('/api/sms/hike-audio', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify({
      mode: body?.mode === 'live' ? 'live' : 'test',
      audio_base64: body.audio_base64,
      dry_run: body?.dry_run === true,
    }),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.ok ? 200 : 502 })
}
