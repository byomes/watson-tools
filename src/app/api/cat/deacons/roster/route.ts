import { NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'
import { getSession, getSessionToken } from '@/lib/deaconAuth'

export async function GET() {
  if (!(await isToolLive('cat', 'deacons'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Full congregation roster (names, emails, phones, addresses,
  // birthdates, prayer requests, deacon notes) -- this used to be
  // reachable by anyone who knew the URL, since the now-deleted
  // standalone /cat/deacons page had no PIN of its own. Only
  // /cat/deaconapp reads this now, and it already requires a session.
  const sessionToken = await getSessionToken()
  if (!(await getSession()) || !sessionToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // X-Deacon-Session is checked independently by Watson itself (not just
  // this route) -- see deacons_web.py's module docstring on why
  // DEACONS_API_KEY alone is no longer sufficient.
  const res = await watsonFetch('/api/cat/deacons/roster', {
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '', 'X-Deacon-Session': sessionToken },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load roster' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
