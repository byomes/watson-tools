import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const res = await watsonFetch(`/api/sms/threads/${id}/link-member`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
