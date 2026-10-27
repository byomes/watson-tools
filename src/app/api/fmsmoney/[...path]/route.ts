import { NextRequest, NextResponse } from 'next/server'
import { fmsWatson, getFmsUser } from '@/lib/fmsAuth'

// Session-gated pass-through to the Watson FMS Finance API. Watson keeps its own allowlist of which FMS Books calls may be made
// from here (no donor statements, no tax items, no emailing); this route only makes sure a signed-in user is asking.

type Ctx = { params: Promise<{ path: string[] }> }

async function forward(req: NextRequest, ctx: Ctx) {
  const user = await getFmsUser()
  if (!user) return NextResponse.json({ error: 'login required' }, { status: 401 })
  const { path } = await ctx.params
  if (!path.every((seg) => /^[A-Za-z0-9_.@-]+$/.test(seg))) return NextResponse.json({ error: 'bad path' }, { status: 400 })

  const isForm = (req.headers.get('content-type') ?? '').startsWith('multipart/')
  const body = req.method === 'GET' || req.method === 'DELETE' ? undefined : isForm ? await req.formData() : JSON.stringify(await req.json().catch(() => ({})))
  const res = await fmsWatson(`x/${path.join('/')}${req.nextUrl.search}`, {
    method: req.method,
    user,
    headers: isForm || body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body,
  })
  const buf = await res.arrayBuffer()
  return new NextResponse(buf, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' } })
}

export const GET = forward
export const POST = forward
export const DELETE = forward
