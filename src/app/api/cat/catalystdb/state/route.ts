import { NextResponse } from 'next/server'
import { hasDashboardSession } from '@/lib/chmElderAuth'
import { watsonFetch } from '@/lib/watson'

export async function GET() {
  // Read-only, so signed-in elders can load the People list; every write route stays admin-only.
  if (!(await hasDashboardSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const res = await watsonFetch('/api/cat/catalystdb/state', {
    headers: { 'X-Watson-Key': process.env.CATALYSTDB_API_KEY ?? '' },
  })
  if (!res.ok) return NextResponse.json({ error: 'Failed to load members' }, { status: 502 })
  return NextResponse.json(await res.json())
}
