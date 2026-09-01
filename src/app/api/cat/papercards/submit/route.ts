import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'
import { watsonFetch } from '@/lib/watson'

export async function POST(req: NextRequest) {
  if (!(await isToolLive('cat', 'papercards'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const res = await watsonFetch('/api/cat/papercards/submit', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.PAPERCARDS_API_KEY ?? '' },
    body: JSON.stringify({
      service_date: data.service_date,
      campus: data.campus,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      is_first_visit: Boolean(data.is_first_visit),
      how_heard: data.how_heard ?? null,
      next_steps: Array.isArray(data.next_steps) ? data.next_steps : [],
      questions_comments: data.questions_comments ?? null,
      prayer_request: data.prayer_request ?? null,
      prayer_leadership_only: Boolean(data.prayer_leadership_only),
    }),
  })

  const body = await res.json().catch(() => ({}))
  return NextResponse.json(body, { status: res.status })
}
