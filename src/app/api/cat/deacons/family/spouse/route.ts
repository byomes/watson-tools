import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'
import { getSession } from '@/lib/deaconAuth'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'deacons'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Sender comes from the signed session, never from the request body --
  // same reasoning as member/[id]/note/route.ts's author_deacon.
  const deaconName = await getSession()
  if (!deaconName) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const data = await req.json().catch(() => null)
  const memberId = Number(data?.memberId)
  const spouseId = Number(data?.spouseId)
  if (!Number.isInteger(memberId) || !Number.isInteger(spouseId)) {
    return NextResponse.json({ error: 'memberId and spouseId are required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/cat/deacons/family/spouse', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '' },
    body: JSON.stringify({ member_id: memberId, spouse_id: spouseId, sender: deaconName }),
  })

  const resBody = await res.json().catch(() => ({}))
  return NextResponse.json(resBody, { status: res.status })
}
