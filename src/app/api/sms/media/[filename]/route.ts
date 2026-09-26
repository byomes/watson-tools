import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { filename } = await params
  const res = await watsonFetch(`/api/sms/media/${filename}`, {
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return new Response(await res.arrayBuffer(), {
    headers: { 'Content-Type': res.headers.get('content-type') || 'application/octet-stream' },
  })
}
