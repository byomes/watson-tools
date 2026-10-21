import { NextRequest, NextResponse } from 'next/server'
import { requireScratchSession } from '@/lib/scratchAuth'
import { watsonFetch } from '@/lib/watson'

const headers = () => ({ 'X-Watson-Key': process.env.UPLOAD_API_KEY ?? '' })

export async function GET() {
  if (!(await requireScratchSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const res = await watsonFetch('/api/fieldsheet/state', { method: 'GET', headers: headers() })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}

export async function PUT(req: NextRequest) {
  if (!(await requireScratchSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body.state !== 'object') return NextResponse.json({ error: 'bad body' }, { status: 400 })
  const res = await watsonFetch('/api/fieldsheet/state', {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ state: body.state }),
  })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
