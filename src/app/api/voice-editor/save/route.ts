import { NextRequest, NextResponse } from 'next/server'
import { requireVoiceEditorSession } from '@/lib/voiceEditorAuth'
import { watsonFetch } from '@/lib/watson'

// The page-level gate does not protect API routes; check the session here.
export async function POST(req: NextRequest) {
  if (!(await requireVoiceEditorSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const body = await req.text()
  const res = await watsonFetch('/api/voice-editor/save', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.VOICE_EDITOR_API_KEY ?? '' },
    body,
  }, 20000)
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
