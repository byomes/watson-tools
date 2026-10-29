import { NextRequest, NextResponse } from 'next/server'
import { chmIdentity } from '@/lib/chmAuth'
import { watsonFetch } from '@/lib/watson'

// wtsn.me/cat/9e9: the Catalyst data in the 9e9 Digital Shepherding app (a separate Flask app on the Beelink).
// Only the Bill/Donna PIN session gets through; the app then has its own sign-in on top. Requests travel to
// Watson as a JSON envelope (jobs/congregation/nine_proxy_web.py) so binary bodies and images survive.
// Only the app's own session cookie is forwarded, never the other wtsn.me cookies.

export const dynamic = 'force-dynamic'

const PREFIX = '/cat/9e9'
const APP_COOKIE = 'nine_session'

// The signed-in Bill/Donna session maps to that person's account in the app, so there is no second sign-in.
function appUser(name: string): string {
  const n = name.toLowerCase()
  return n.includes('donna') ? 'donna@9e9.app' : n.includes('bill') ? 'bill@9e9.app' : ''
}

type Ctx = { params: Promise<{ path?: string[] }> }

function appCookie(req: NextRequest): string {
  const v = req.cookies.get(APP_COOKIE)?.value
  return v ? `${APP_COOKIE}=${v}` : ''
}

async function forward(req: NextRequest, ctx: Ctx) {
  const who = await chmIdentity()
  if (!who || who.role !== 'admin') {
    if (req.method === 'GET') return NextResponse.redirect(new URL(`/cat/catalystdb/login?next=${PREFIX}`, req.url))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { path = [] } = await ctx.params
  if (!path.every((seg) => !seg.includes('..') && !seg.includes('\\'))) return NextResponse.json({ error: 'bad path' }, { status: 400 })

  const body = req.method === 'POST' ? Buffer.from(await req.arrayBuffer()).toString('base64') : ''
  const res = await watsonFetch(
    '/api/cat/9e9/proxy',
    {
      method: 'POST',
      headers: { 'X-Watson-Key': process.env.CATALYSTDB_API_KEY ?? '' },
      body: JSON.stringify({
        method: req.method,
        path: '/' + path.map(encodeURIComponent).join('/') + (req.nextUrl.pathname.endsWith('/') && path.length ? '/' : ''),
        query: req.nextUrl.search.replace(/^\?/, ''),
        headers: {
          cookie: appCookie(req),
          'content-type': req.headers.get('content-type') ?? '',
          accept: req.headers.get('accept') ?? '',
          'accept-language': req.headers.get('accept-language') ?? '',
          'user-agent': req.headers.get('user-agent') ?? '',
        },
        nine_user: appUser(who.user),
        body_b64: body,
      }),
    },
    30000,
  )
  const env = await res.json().catch(() => null)
  if (!env || typeof env.status !== 'number') {
    return new NextResponse('The 9e9 app is not reachable right now. Try again in a minute.', { status: 502 })
  }
  const headers = new Headers()
  for (const [k, v] of env.headers as [string, string][]) {
    if (k.toLowerCase() === 'set-cookie') headers.append('set-cookie', v)
    else headers.set(k, v)
  }
  headers.set('x-robots-tag', 'noindex, nofollow')
  const status: number = env.status
  const payload = status === 204 || status === 304 ? null : Buffer.from(env.body_b64 ?? '', 'base64')
  return new NextResponse(payload, { status, headers })
}

export const GET = forward
export const POST = forward
export const HEAD = forward
