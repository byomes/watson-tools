import { NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET() {
  if (!(await isToolLive('cat', 'servants'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const res = await watsonFetch('/api/cat/servants/state', {
    headers: { 'X-Watson-Key': process.env.SERVANTS_API_KEY ?? '' },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load servant teams' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
