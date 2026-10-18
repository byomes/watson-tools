import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

// Safety button on /hike.html. Same PIN session as /sms gates it, so the
// public page can't be used to text anyone. Who actually gets texted (test
// mode = Emily only, live = wife + three kids) is decided by the backend,
// never by this route or the browser.

export async function GET() {
  return NextResponse.json({ loggedIn: await requireSmsSession() })
}

export async function POST(req: Request) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const lat = Number(body?.lat)
  const lng = Number(body?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }
  const res = await watsonFetch('/api/sms/hike-sos', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify({
      mode: body?.mode === 'live' ? 'live' : 'test',
      lat,
      lng,
      acc: Number(body?.acc) || null,
      ts: Number(body?.ts) || null,
      dry_run: body?.dry_run === true,
    }),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.ok ? 200 : 502 })
}
