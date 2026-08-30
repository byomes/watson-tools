import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'duplicates'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await req.json().catch(() => null)
  const flagId = Number(data?.flag_id)
  if (!Number.isInteger(flagId)) {
    return NextResponse.json({ error: 'flag_id is required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/cat/duplicates/dismiss', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DUPLICATES_API_KEY ?? '' },
    body: JSON.stringify({ flag_id: flagId }),
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
