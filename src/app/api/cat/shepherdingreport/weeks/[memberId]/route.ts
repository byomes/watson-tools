import { NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function GET(_req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  if (!(await isToolLive('cat', 'shepherdingreport'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { memberId } = await params
  const id = Number(memberId)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Invalid member id' }, { status: 400 })
  }

  const res = await watsonFetch(`/api/cat/shepherdingreport/weeks/${id}`, {
    headers: { 'X-Watson-Key': process.env.SHEPHERDING_REPORT_API_KEY ?? '' },
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
