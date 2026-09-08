import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'
import { getSession } from '@/lib/deaconAuth'

// Edit/delete a deacon note. Per Bill's 2026-09-08 request, any logged-in
// deacon-app user can edit or delete any note -- same "unified roster, not
// scoped to their own people" philosophy as the rest of /cat/deacons (see
// jobs/congregation/deacons_web.py's module docstring), so there's no
// author check here beyond requiring a valid session.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  if (!(await isToolLive('cat', 'deacons'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const deaconName = await getSession()
  if (!deaconName) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id, noteId } = await params
  const data = await req.json().catch(() => null)
  const note = typeof data?.note === 'string' ? data.note.trim() : ''
  if (!note) {
    return NextResponse.json({ error: 'note is required' }, { status: 400 })
  }

  const res = await watsonFetch(
    `/api/cat/deacons/member/${encodeURIComponent(id)}/note/${encodeURIComponent(noteId)}`,
    {
      method: 'PATCH',
      headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '' },
      body: JSON.stringify({ note }),
    },
  )

  const resBody = await res.json().catch(() => ({}))
  return NextResponse.json(resBody, { status: res.status })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  if (!(await isToolLive('cat', 'deacons'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const deaconName = await getSession()
  if (!deaconName) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id, noteId } = await params

  const res = await watsonFetch(
    `/api/cat/deacons/member/${encodeURIComponent(id)}/note/${encodeURIComponent(noteId)}`,
    {
      method: 'DELETE',
      headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '' },
    },
  )

  const resBody = await res.json().catch(() => ({}))
  return NextResponse.json(resBody, { status: res.status })
}
