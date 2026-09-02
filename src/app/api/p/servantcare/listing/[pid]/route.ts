import { NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET(_req: Request, { params }: { params: Promise<{ pid: string }> }) {
  if (!(await isToolLive('p', 'servantcare'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { pid } = await params
  const res = await watsonFetch(`/api/p/servantcare/listing/${encodeURIComponent(pid)}`, {
    headers: { 'X-Watson-Key': process.env.SERVANTCARE_API_KEY ?? '' },
  })
  if (!res.ok) {
    return NextResponse.json({ error: 'Listing not found' }, { status: res.status === 404 ? 404 : 502 })
  }
  return NextResponse.json(await res.json())
}
