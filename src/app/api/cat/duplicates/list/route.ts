import { NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET() {
  if (!(await isToolLive('cat', 'duplicates'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const res = await watsonFetch('/api/cat/duplicates/list', {
    headers: { 'X-Watson-Key': process.env.DUPLICATES_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load duplicates' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
