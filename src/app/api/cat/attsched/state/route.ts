import { NextRequest, NextResponse } from 'next/server'
import { requireCatalystDBSession } from '@/lib/catalystdbAuth'
import { watsonFetch } from '@/lib/watson'

export async function GET(req: NextRequest) {
  if (!(await requireCatalystDBSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const kind = req.nextUrl.searchParams.get('kind') === 'teams' ? 'teams' : 'groups'
  const res = await watsonFetch(`/api/cat/attsched/state?kind=${kind}`, {
    headers: { 'X-Watson-Key': process.env.CATALYSTDB_API_KEY ?? '' },
  })
  if (!res.ok) return NextResponse.json({ error: 'Failed to load groups' }, { status: 502 })
  return NextResponse.json(await res.json())
}
