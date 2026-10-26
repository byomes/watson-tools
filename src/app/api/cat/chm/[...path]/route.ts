import { NextRequest, NextResponse } from 'next/server'
import { chmIdentity } from '@/lib/chmAuth'
import { watsonFetch } from '@/lib/watson'

// One authenticated pass-through to the Watson CHM blueprint (jobs/congregation/chm_web.py).
// Identity and role come from the signed session cookie, never from the browser.

type Ctx = { params: Promise<{ path: string[] }> }

async function forward(req: NextRequest, ctx: Ctx) {
  const who = await chmIdentity()
  if (!who) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { path } = await ctx.params
  if (!path.every((seg) => /^[A-Za-z0-9_-]+$/.test(seg))) {
    return NextResponse.json({ error: 'bad path' }, { status: 400 })
  }
  const qs = req.nextUrl.search
  const hasBody = req.method !== 'GET' && req.method !== 'DELETE'
  const body = hasBody ? JSON.stringify(await req.json().catch(() => ({}))) : undefined

  const res = await watsonFetch(`/api/cat/chm/${path.join('/')}${qs}`, {
    method: req.method,
    headers: {
      'X-Watson-Key': process.env.CATALYSTDB_API_KEY ?? '',
      'X-CHM-User': who.user,
      'X-CHM-Role': who.role,
    },
    body,
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

export const GET = forward
export const POST = forward
export const PATCH = forward
export const DELETE = forward
