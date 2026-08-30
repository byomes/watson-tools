import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'duplicates'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const flagId = Number(data.flag_id)
  const keepId = Number(data.keep_id)
  const mergeId = Number(data.merge_id)
  const name = typeof data.name === 'string' ? data.name : undefined

  if (![flagId, keepId, mergeId].every(Number.isInteger)) {
    return NextResponse.json({ error: 'flag_id, keep_id, merge_id are required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/cat/duplicates/merge', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DUPLICATES_API_KEY ?? '' },
    body: JSON.stringify({ flag_id: flagId, keep_id: keepId, merge_id: mergeId, name }),
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
