import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

// Same anti-bot floor as src/app/api/cat/connect/route.ts -- a human needs
// at least this long between the form rendering and hitting Submit.
const MIN_FILL_TIME_MS = 1500

function cleanEntries(raw: unknown, field: 'name' | 'names'): { value: string; date: string }[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
    .map(e => ({
      value: typeof e[field] === 'string' ? (e[field] as string).trim().slice(0, 200) : '',
      date: typeof e.date === 'string' ? (e.date as string).trim().slice(0, 20) : '',
    }))
    .filter(e => e.value || e.date)
}

export async function POST(req: NextRequest) {
  // Gate the endpoint itself, not just the page -- see connect/route.ts's
  // own comment on why requireLiveTool() alone doesn't protect this route.
  if (!(await isToolLive('cat', 'bday'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  // Bot checks first, before any validation error can teach a bot which
  // field it got wrong -- both fail the same way (200 ok, nothing sent),
  // so a bot sees a "successful" submission with no signal to adapt.
  if (typeof data.website === 'string' && data.website.trim() !== '') {
    console.warn('[cat/bday] Blocked submission: honeypot field filled')
    return NextResponse.json({ ok: true })
  }
  const renderedAt = typeof data.renderedAt === 'number' ? data.renderedAt : null
  if (renderedAt === null || Date.now() - renderedAt < MIN_FILL_TIME_MS) {
    console.warn('[cat/bday] Blocked submission: missing or too-fast renderedAt')
    return NextResponse.json({ ok: true })
  }

  const submittedByName = typeof data.submittedByName === 'string' ? data.submittedByName.trim().slice(0, 200) : ''
  const birthdaysRaw = cleanEntries(data.birthdays, 'name')
  const anniversariesRaw = cleanEntries(data.anniversaries, 'names')

  if (birthdaysRaw.length === 0 && anniversariesRaw.length === 0) {
    return NextResponse.json({ error: 'Add at least one birthday or anniversary.' }, { status: 400 })
  }

  const res = await watsonFetch('/api/cat/bday/submit', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.BDAY_API_KEY ?? '' },
    body: JSON.stringify({
      submittedByName: submittedByName || null,
      birthdays: birthdaysRaw.map(e => ({ name: e.value, date: e.date })),
      anniversaries: anniversariesRaw.map(e => ({ names: e.value, date: e.date })),
    }),
  }).catch(err => {
    console.error('[cat/bday] watsonFetch failed:', err)
    return null
  })

  if (!res || !res.ok) {
    const errText = res ? await res.text().catch(() => '') : ''
    console.error(`[cat/bday] Watson submit failed: status=${res?.status} body=${errText}`)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
