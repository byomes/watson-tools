import { NextResponse } from 'next/server'
import { requireCatalystDBSession } from '@/lib/catalystdbAuth'
import { watsonFetch } from '@/lib/watson'

export async function GET() {
  if (!(await requireCatalystDBSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const res = await watsonFetch('/api/cat/catalystdb/state', {
    headers: { 'X-Watson-Key': process.env.CATALYSTDB_API_KEY ?? '' },
  })
  if (!res.ok) return NextResponse.json({ error: 'Failed to load members' }, { status: 502 })
  return NextResponse.json(await res.json())
}
