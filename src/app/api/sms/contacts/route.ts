import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

export async function GET(req: Request) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const params = new URL(req.url).searchParams
  const q = params.get('q') || ''
  const all = params.get('all') === '1'
  if (!q.trim() && !all) {
    return NextResponse.json({ contacts: [] })
  }

  const res = await watsonFetch(`/api/sms/contacts?${all && !q.trim() ? 'all=1' : `q=${encodeURIComponent(q)}`}`, {
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ contacts: [] })
  }
  return NextResponse.json(await res.json())
}
