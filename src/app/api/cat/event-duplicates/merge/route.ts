import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'event-duplicates'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const flagId = Number(data.flag_id)
  const keepId = Number(data.keep_id)
  const mergeId = Number(data.merge_id)
  const numTickets = data.num_tickets === undefined || data.num_tickets === null
    ? undefined
    : Number(data.num_tickets)

  if (![flagId, keepId, mergeId].every(Number.isInteger)) {
    return NextResponse.json({ error: 'flag_id, keep_id, merge_id are required' }, { status: 400 })
  }
  if (numTickets !== undefined && !Number.isInteger(numTickets)) {
    return NextResponse.json({ error: 'num_tickets must be an integer' }, { status: 400 })
  }

  const res = await watsonFetch('/api/cat/events/duplicates/merge', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DUPLICATES_API_KEY ?? '' },
    body: JSON.stringify({ flag_id: flagId, keep_id: keepId, merge_id: mergeId, num_tickets: numTickets }),
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
