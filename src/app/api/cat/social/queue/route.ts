import { NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { isLoggedIn } from '@/lib/socialAuth'
import { watsonFetch } from '@/lib/watson'

export async function GET() {
  if (!(await isToolLive('cat', 'social'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!(await isLoggedIn())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const res = await watsonFetch('/api/cat/social/queue', {
    headers: { 'X-Watson-Key': process.env.CHURCH_SOCIAL_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to load queue' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
