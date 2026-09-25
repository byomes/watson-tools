import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const text = typeof body?.body === 'string' ? body.body : ''
  if (!text.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  const res = await watsonFetch(`/api/sms/templates/${id}`, {
    method: 'PUT',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify({ body: text }),
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to save template' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
