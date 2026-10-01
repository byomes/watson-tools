import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

const MAX_BYTES = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'kidsatt'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return NextResponse.json({ error: 'File must be a .csv' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File is too large (5MB max)' }, { status: 400 })
  }

  // watsonFetch's shared transport only carries JSON bodies (see
  // src/lib/watson.ts), so the browser's multipart upload is converted to
  // base64 here rather than teaching that helper to stream binary bodies.
  const buffer = Buffer.from(await file.arrayBuffer())

  const res = await watsonFetch('/api/cat/kidsatt/import', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.KIDS_ATTENDANCE_API_KEY ?? '' },
    body: JSON.stringify({ filename: file.name, content_base64: buffer.toString('base64') }),
  })

  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
