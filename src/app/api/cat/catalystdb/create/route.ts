import { NextRequest, NextResponse } from 'next/server'
import { requireCatalystDBSession } from '@/lib/catalystdbAuth'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest) {
  if (!(await requireCatalystDBSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const res = await watsonFetch('/api/cat/catalystdb/create', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.CATALYSTDB_API_KEY ?? '' },
    body: JSON.stringify(data),
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
