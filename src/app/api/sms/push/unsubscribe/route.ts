import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: Request) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const res = await watsonFetch('/api/sms/push/unsubscribe', {
    method: 'POST',
    headers: {
      'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to unsubscribe' }))
    return NextResponse.json(err, { status: res.status })
  }
  return NextResponse.json(await res.json())
}
