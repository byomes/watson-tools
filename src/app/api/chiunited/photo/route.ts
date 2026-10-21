import { NextRequest, NextResponse } from 'next/server'
import { requireChiunitedSession } from '@/lib/chiunitedAuth'
import { watsonFetch } from '@/lib/watson'

// The page downscales photos to ~1800px JPEG before posting (keeps each one
// well under Vercel's 4.5MB request-body cap), so this takes base64 JSON.
export async function POST(req: NextRequest) {
  if (!(await requireChiunitedSession())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body.content_base64 !== 'string') return NextResponse.json({ error: 'bad body' }, { status: 400 })
  const res = await watsonFetch('/api/fieldsheet/photo', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.UPLOAD_API_KEY ?? '' },
    body: JSON.stringify({ tag: String(body.tag ?? 'general'), content_base64: body.content_base64 }),
  })
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
