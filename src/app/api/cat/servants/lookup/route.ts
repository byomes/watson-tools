import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET(req: NextRequest) {
  if (!(await isToolLive('cat', 'servants'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const name = req.nextUrl.searchParams.get('name') ?? ''
  const res = await watsonFetch(`/api/cat/servants/lookup?name=${encodeURIComponent(name)}`, {
    headers: { 'X-Watson-Key': process.env.SERVANTS_API_KEY ?? '' },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Lookup failed' }, { status: 502 })
  }
  return NextResponse.json(await res.json())
}
