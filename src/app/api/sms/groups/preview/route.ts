import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: Request) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)

  const res = await watsonFetch('/api/sms/groups/preview', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify({
      filter: body?.filter ?? {},
      active_only: body?.active_only ?? true,
      manual: Array.isArray(body?.manual) ? body.manual : [],
      manual_only: body?.manual_only ?? false,
    }),
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to preview group' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
