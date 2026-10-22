import { NextRequest, NextResponse } from 'next/server'
import { requireUploadSession } from '@/lib/uploadAuth'
import { watsonFetch } from '@/lib/watson'

// Pasted text from the upload page. Same session check as ../route.ts; the body is never logged here.
export async function POST(req: NextRequest) {
  // Write-only: text is appended to a locked file on the Beelink and never read back by this route.
  if (!(await requireUploadSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const data = await req.json().catch(() => null)
  const text = typeof data?.text === 'string' ? data.text : ''
  const label = typeof data?.label === 'string' ? data.label : ''
  if (!text.trim()) return NextResponse.json({ error: 'Nothing to save' }, { status: 400 })

  const res = await watsonFetch('/api/uploads/text', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.UPLOAD_API_KEY ?? '' },
    body: JSON.stringify({ text, label }),
  })
  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
