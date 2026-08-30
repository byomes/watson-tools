import { NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function POST() {
  if (!(await isToolLive('cat', 'duplicates'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const res = await watsonFetch('/api/cat/duplicates/rescan', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DUPLICATES_API_KEY ?? '' },
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
