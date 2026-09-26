import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function GET(req: Request) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const q = new URL(req.url).searchParams.get('q') || ''
  if (!q.trim()) {
    return NextResponse.json({ results: [] })
  }

  const res = await watsonFetch(`/api/sms/search?q=${encodeURIComponent(q)}`, {
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Search failed' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
