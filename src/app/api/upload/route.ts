import { NextRequest, NextResponse } from 'next/server'
import { requireUploadSession } from '@/lib/uploadAuth'
import { watsonFetch } from '@/lib/watson'

const MAX_BYTES = 25 * 1024 * 1024

export async function POST(req: NextRequest) {
  // The page-level gate in (gated)/layout.tsx does not protect this route --
  // it must check the session itself (same lesson as requireLiveTool.ts).
  if (!(await requireUploadSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const note = String(form?.get('note') ?? '')
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File is too large (25MB max)' }, { status: 400 })
  }

  // watsonFetch's shared transport only carries JSON bodies (see
  // src/lib/watson.ts), so the browser's multipart upload is converted to
  // base64 here rather than teaching that helper to stream binary bodies.
  const buffer = Buffer.from(await file.arrayBuffer())

  const res = await watsonFetch('/api/uploads/create', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.UPLOAD_API_KEY ?? '' },
    body: JSON.stringify({
      filename: file.name,
      content_base64: buffer.toString('base64'),
      note,
    }),
  })

  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
