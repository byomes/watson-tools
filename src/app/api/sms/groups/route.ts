import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function GET() {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const res = await watsonFetch('/api/sms/groups', {
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load groups' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}

export async function POST(req: Request) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/sms/groups', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify({
      name,
      filter: body?.filter ?? {},
      active_only: body?.active_only ?? true,
      manual_only: body?.manual_only ?? false,
      manual: Array.isArray(body?.manual) ? body.manual : [],
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json({ error: data?.error || 'Failed to create group' }, { status: res.status === 400 ? 400 : 502 })
  }
  return NextResponse.json(data, { status: 201 })
}
