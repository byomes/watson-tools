import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/catalystdbAuth'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest) {
  const by = await getSession()
  if (!by) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const res = await watsonFetch('/api/cat/attsched/cover', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.CATALYSTDB_API_KEY ?? '' },
    body: JSON.stringify({
      title: data.title,
      mode: data.mode,
      weeks: data.weeks,
      member_id: data.member_id,
      by,
    }),
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
