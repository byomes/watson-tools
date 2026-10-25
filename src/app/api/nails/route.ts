import { NextRequest, NextResponse } from 'next/server'
import { createSession, isLoggedIn } from '@/lib/nailsAuth'
import { watsonFetch } from '@/lib/watson'

// One endpoint for the whole /nails page: { action, ... } in a JSON body.
// unlock / code / verify are open (they are how you get in); start / photo /
// finish need the nails_session cookie, which this route checks itself (the
// page-level lock does not protect API routes). The PIN, the lockout and
// the texted code are all enforced on Watson, not here.

const MAX_BODY_CHARS = 6 * 1024 * 1024 // base64 of one resized photo; Vercel caps request bodies near 4.5MB anyway

async function toWatson(path: string, payload: unknown) {
  const res = await watsonFetch(path, {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.NAILS_API_KEY ?? '' },
    body: JSON.stringify(payload ?? {}),
  }, 30000)
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

export async function POST(req: NextRequest) {
  const raw = await req.text()
  if (raw.length > MAX_BODY_CHARS) return NextResponse.json({ error: 'Too big' }, { status: 413 })
  let data: Record<string, unknown> = {}
  try { data = JSON.parse(raw) } catch { /* empty */ }
  const action = String(data.action ?? '')

  try {
    if (action === 'unlock' || action === 'verify') {
      const r = action === 'unlock'
        ? await toWatson('/api/nails/unlock', { pin: data.pin })
        : await toWatson('/api/nails/code/verify', { code: data.code })
      if (r.status === 200 && r.body.ok) await createSession()
      return NextResponse.json(r.body, { status: r.status })
    }
    if (action === 'code') {
      const r = await toWatson('/api/nails/code/send', {})
      return NextResponse.json(r.body, { status: r.status })
    }

    if (!(await isLoggedIn())) return NextResponse.json({ error: 'locked' }, { status: 401 })
    const id = String(data.id ?? '')
    if (action === 'start') {
      const r = await toWatson('/api/nails/submission/start', { title: data.title, description: data.description })
      return NextResponse.json(r.body, { status: r.status })
    }
    if (action === 'photo' && /^[0-9a-f]{32}$/.test(id)) {
      const r = await toWatson(`/api/nails/submission/${id}/photo`, { filename: data.filename, content_base64: data.content_base64 })
      return NextResponse.json(r.body, { status: r.status })
    }
    if (action === 'finish' && /^[0-9a-f]{32}$/.test(id)) {
      const r = await toWatson(`/api/nails/submission/${id}/finish`, {})
      return NextResponse.json(r.body, { status: r.status })
    }
  } catch {
    return NextResponse.json({ error: 'Could not reach the server. Try again.' }, { status: 502 })
  }
  return NextResponse.json({ error: 'Bad request' }, { status: 400 })
}
