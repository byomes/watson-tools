import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'
import { getSession, getSessionToken } from '@/lib/deaconAuth'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'deacons'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const sessionToken = await getSessionToken()
  if (!(await getSession()) || !sessionToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const data = await req.json().catch(() => null)
  const childId = Number(data?.childId)
  const parentId = Number(data?.parentId)
  if (!Number.isInteger(childId) || !Number.isInteger(parentId)) {
    return NextResponse.json({ error: 'childId and parentId are required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/cat/deacons/family/child', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '', 'X-Deacon-Session': sessionToken },
    body: JSON.stringify({ child_id: childId, parent_id: parentId }),
  })

  const resBody = await res.json().catch(() => ({}))
  return NextResponse.json(resBody, { status: res.status })
}
