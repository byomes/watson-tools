import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/catalystdbAuth'
import { watsonFetch } from '@/lib/watson'

export const dynamic = 'force-dynamic'

// Removes an RSVP that was entered by hand on this page (form submissions are never touched).
export async function POST(req: NextRequest) {
  const by = await getSession()
  if (!by) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const res = await watsonFetch('/api/cat/events/rsvp/undo', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.CATALYSTDB_API_KEY ?? '' },
    body: JSON.stringify({ ...data, by }),
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
