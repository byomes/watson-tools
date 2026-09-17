import { NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'
import { getSession } from '@/lib/deaconAuth'

export async function GET() {
  if (!(await isToolLive('cat', 'deacons'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Full congregation roster (names, emails, phones, addresses,
  // birthdates, prayer requests, deacon notes) -- this used to be
  // reachable by anyone who knew the URL, since the now-deleted
  // standalone /cat/deacons page had no PIN of its own. Only
  // /cat/deaconapp reads this now, and it already requires a session.
  if (!(await getSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const res = await watsonFetch('/api/cat/deacons/roster', {
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load roster' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
