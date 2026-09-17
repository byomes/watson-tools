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
  const name = typeof data?.name === 'string' ? data.name : ''
  if (!name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/cat/deacons/member/create', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '', 'X-Deacon-Session': sessionToken },
    body: JSON.stringify({
      name,
      email: data?.email ?? null,
      phone: data?.phone ?? null,
      address: data?.address ?? null,
      birthdate: data?.birthdate ?? null,
    }),
  })

  const resBody = await res.json().catch(() => ({}))
  return NextResponse.json(resBody, { status: res.status })
}
