import { NextRequest, NextResponse } from 'next/server'
import { requireScratchSession } from '@/lib/scratchAuth'
import { watsonFetch } from '@/lib/watson'

export async function GET(req: NextRequest) {
  if (!(await requireScratchSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const res = await watsonFetch('/api/cat/addrreview/list', {
    method: 'GET',
    headers: { 'X-Watson-Key': process.env.CATALYSTDB_API_KEY ?? '' },
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
