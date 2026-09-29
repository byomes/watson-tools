import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function GET() {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const res = await watsonFetch('/api/sms/broadcasts', {
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load broadcasts' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}

// This is the confirm/lock-in step -- the caller is expected to have
// already shown the resolved recipient list via POST /api/sms/groups/preview
// or GET /api/sms/groups/[id]/members before calling this (see
// jobs/sms/api.py's create_broadcast docstring).
export async function POST(req: Request) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const text = typeof body?.body === 'string' ? body.body.trim() : ''
  const sendAt = typeof body?.send_at === 'string' ? body.send_at : ''
  if (!text || !sendAt) {
    return NextResponse.json({ error: 'body and send_at are required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/sms/broadcasts', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify({
      body: text,
      send_at: sendAt,
      group_id: body?.group_id,
      group_name: typeof body?.group_name === 'string' ? body.group_name : undefined,
      filter: body?.filter,
      active_only: body?.active_only,
      manual_only: body?.manual_only,
      manual: Array.isArray(body?.manual) ? body.manual : undefined,
      exclude_phones: Array.isArray(body?.exclude_phones) ? body.exclude_phones : undefined,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json({ error: data?.error || 'Failed to schedule broadcast' }, { status: res.status === 400 || res.status === 404 ? res.status : 502 })
  }
  return NextResponse.json(data, { status: 201 })
}
