import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'
import { getSession } from '@/lib/deaconAuth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isToolLive('cat', 'deacons'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Every other write route here (note, create, family/*) already requires
  // a signed-in deacon -- this one didn't, so a member's name/email/phone/
  // address/birthdate could be edited by anyone who found the URL, no PIN
  // needed. The standalone /cat/deacons page this predated (no PIN gate of
  // its own) is gone now, replaced by /cat/deaconapp -- see its login flow.
  if (!(await getSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const res = await watsonFetch(`/api/cat/deacons/member/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '' },
    body: JSON.stringify(body),
  })

  const resBody = await res.json().catch(() => ({}))
  return NextResponse.json(resBody, { status: res.status })
}
