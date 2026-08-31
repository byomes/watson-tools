import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isToolLive('cat', 'deacons'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { id } = await params
  const data = await req.json().catch(() => null)
  const note = typeof data?.note === 'string' ? data.note.trim() : ''
  if (!note) {
    return NextResponse.json({ error: 'note is required' }, { status: 400 })
  }

  const res = await watsonFetch(`/api/cat/deacons/member/${encodeURIComponent(id)}/follow-up`, {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '' },
    body: JSON.stringify({ note }),
  })

  const resBody = await res.json().catch(() => ({}))
  return NextResponse.json(resBody, { status: res.status })
}
