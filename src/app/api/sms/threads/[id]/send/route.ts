import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  const mediaBase64 = typeof body?.media_base64 === 'string' ? body.media_base64 : undefined
  const mediaType = typeof body?.media_type === 'string' ? body.media_type : undefined
  if (!text && !mediaBase64) {
    return NextResponse.json({ error: 'text or media_base64 is required' }, { status: 400 })
  }

  const res = await watsonFetch(`/api/sms/threads/${id}/send`, {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
    body: JSON.stringify({ text, media_base64: mediaBase64, media_type: mediaType }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json({ error: data?.error || 'Failed to send' }, { status: res.status === 400 ? 400 : 502 })
  }
  return NextResponse.json(data)
}
