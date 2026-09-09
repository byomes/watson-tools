import { NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET() {
  if (!(await isToolLive('p', 'beachhouse'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const res = await watsonFetch('/api/p/beachhouse/categories', {
    headers: { 'X-Watson-Key': process.env.BEACHHOUSE_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
