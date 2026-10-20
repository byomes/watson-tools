import { NextRequest, NextResponse } from 'next/server'
import { requireVoiceEditorSession } from '@/lib/voiceEditorAuth'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest) {
  if (!(await requireVoiceEditorSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const body = await req.text()
  // A local model call, so allow far longer than watsonFetch's 8s default.
  const res = await watsonFetch('/api/voice-editor/polish', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.VOICE_EDITOR_API_KEY ?? '' },
    body,
  }, 55000)
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
