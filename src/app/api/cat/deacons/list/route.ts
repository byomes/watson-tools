import { NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'
import { getSession, getSessionToken } from '@/lib/deaconAuth'

export async function GET() {
  if (!(await isToolLive('cat', 'deacons'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const sessionToken = await getSessionToken()
  if (!(await getSession()) || !sessionToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const res = await watsonFetch('/api/cat/deacons/list', {
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '', 'X-Deacon-Session': sessionToken },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load deacon list' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
