import { NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isToolLive('p', 'beachhouse'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const res = await watsonFetch(`/api/p/beachhouse/listing/${encodeURIComponent(id)}/price`, {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.BEACHHOUSE_API_KEY ?? '' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Update failed' }, { status: res.status === 404 ? 404 : 502 })
  }
  return NextResponse.json(await res.json())
}
