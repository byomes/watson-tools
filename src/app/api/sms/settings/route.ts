import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function GET() {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const res = await watsonFetch('/api/sms/settings', {
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}

export async function PATCH(req: Request) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const res = await watsonFetch('/api/sms/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
