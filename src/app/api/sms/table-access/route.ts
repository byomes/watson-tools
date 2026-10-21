import { NextResponse } from 'next/server'
import { requireSmsSession } from '@/lib/smsAuth'
import { watsonFetch } from '@/lib/watson'

// Bill-only: same PIN session as the Watson SMS app (see lib/smsAuth.ts). Backs wtsn.me/cat/tableaccess.
export const dynamic = 'force-dynamic'

const BACKEND_KEY = () => process.env.SMS_APP_API_KEY ?? ''

export async function GET() {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const res = await watsonFetch('/api/cat/table-access', {
    headers: { 'X-Watson-Key': BACKEND_KEY() },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load table access' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}

export async function POST(req: Request) {
  if (!(await requireSmsSession())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const res = await watsonFetch('/api/cat/table-access', {
    method: 'POST',
    headers: {
      'X-Watson-Key': BACKEND_KEY(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json().catch(() => ({ error: 'Failed to save' }))
  return NextResponse.json(data, { status: res.status })
}
