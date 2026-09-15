import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { isLoggedIn } from '@/lib/socialAuth'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'social'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!(await isLoggedIn())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const res = await watsonFetch('/api/cat/social/cancel', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.CHURCH_SOCIAL_API_KEY ?? '' },
    body: JSON.stringify({ id: body.id }),
  })
  const data = await res.json().catch(() => ({ error: 'Bad response from Watson' }))
  return NextResponse.json(data, { status: res.status })
}
