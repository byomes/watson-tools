import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'
import { getSession } from '@/lib/deaconAuth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isToolLive('cat', 'deacons'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Author comes from the signed session, never from the request body —
  // the client can't be trusted to say who's logging the note.
  const deaconName = await getSession()
  if (!deaconName) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const data = await req.json().catch(() => null)
  const note = typeof data?.note === 'string' ? data.note.trim() : ''
  if (!note) {
    return NextResponse.json({ error: 'note is required' }, { status: 400 })
  }

  const res = await watsonFetch(`/api/cat/deacons/member/${encodeURIComponent(id)}/note`, {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '' },
    body: JSON.stringify({ note, author_deacon: deaconName }),
  })

  const resBody = await res.json().catch(() => ({}))
  return NextResponse.json(resBody, { status: res.status })
}
