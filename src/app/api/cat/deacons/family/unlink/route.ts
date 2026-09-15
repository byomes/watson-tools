import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'
import { getSession } from '@/lib/deaconAuth'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'deacons'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const deaconName = await getSession()
  if (!deaconName) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const data = await req.json().catch(() => null)
  const memberId = Number(data?.memberId)
  if (!Number.isInteger(memberId)) {
    return NextResponse.json({ error: 'memberId is required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/cat/deacons/family/unlink', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '' },
    body: JSON.stringify({ member_id: memberId, sender: deaconName }),
  })

  const resBody = await res.json().catch(() => ({}))
  return NextResponse.json(resBody, { status: res.status })
}
