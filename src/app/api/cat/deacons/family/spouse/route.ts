import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'
import { getSession, getSessionToken } from '@/lib/deaconAuth'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'deacons'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Sender is resolved by Watson itself from X-Deacon-Session, never from
  // the request body -- same reasoning as member/[id]/note/route.ts.
  const sessionToken = await getSessionToken()
  if (!(await getSession()) || !sessionToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const data = await req.json().catch(() => null)
  const memberId = Number(data?.memberId)
  const spouseId = Number(data?.spouseId)
  const spouseRole = data?.spouseRole
  if (!Number.isInteger(memberId) || !Number.isInteger(spouseId)) {
    return NextResponse.json({ error: 'memberId and spouseId are required' }, { status: 400 })
  }
  if (spouseRole !== 'husband' && spouseRole !== 'wife') {
    return NextResponse.json({ error: "spouseRole must be 'husband' or 'wife'" }, { status: 400 })
  }

  const res = await watsonFetch('/api/cat/deacons/family/spouse', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '', 'X-Deacon-Session': sessionToken },
    body: JSON.stringify({ member_id: memberId, spouse_id: spouseId, spouse_role: spouseRole }),
  })

  const resBody = await res.json().catch(() => ({}))
  return NextResponse.json(resBody, { status: res.status })
}
