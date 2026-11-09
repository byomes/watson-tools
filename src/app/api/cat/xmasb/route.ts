import { NextResponse } from 'next/server'
import { requireCatalystDBSession } from '@/lib/catalystdbAuth'
import { watsonFetch } from '@/lib/watson'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await requireCatalystDBSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const res = await watsonFetch('/api/cat/xmasb', {
    headers: { 'X-Watson-Key': process.env.CATALYSTDB_API_KEY ?? '' },
  })
  if (!res.ok) return NextResponse.json({ error: 'Failed to load' }, { status: 502 })
  return NextResponse.json(await res.json(), { headers: { 'Cache-Control': 'no-store' } })
}
