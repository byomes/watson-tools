import { NextRequest, NextResponse } from 'next/server'
import { requireCatalystDBSession } from '@/lib/catalystdbAuth'
import { watsonFetch } from '@/lib/watson'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await requireCatalystDBSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const id = Number(req.nextUrl.searchParams.get('event_id') ?? 0)
  const res = await watsonFetch(`/api/cat/events/rsvp?event_id=${Number.isFinite(id) ? id : 0}`, {
    headers: { 'X-Watson-Key': process.env.CATALYSTDB_API_KEY ?? '' },
  })
  if (!res.ok) return NextResponse.json({ error: 'Failed to load RSVPs' }, { status: 502 })
  return NextResponse.json(await res.json(), { headers: { 'Cache-Control': 'no-store' } })
}
