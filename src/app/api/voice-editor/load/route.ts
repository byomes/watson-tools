import { NextRequest, NextResponse } from 'next/server'
import { requireVoiceEditorSession } from '@/lib/voiceEditorAuth'
import { watsonFetch } from '@/lib/watson'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await requireVoiceEditorSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const entry = req.nextUrl.searchParams.get('entry') ?? ''
  const res = await watsonFetch(`/api/voice-editor/load?entry=${encodeURIComponent(entry)}`, {
    headers: { 'X-Watson-Key': process.env.VOICE_EDITOR_API_KEY ?? '' },
  }, 20000)
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status })
}
