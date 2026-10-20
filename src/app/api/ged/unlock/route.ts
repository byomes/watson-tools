import { NextRequest, NextResponse } from 'next/server'
import { GED_COOKIE, GED_TTL_MS, checkGedPin, makeGedToken } from '@/lib/gedAuth'

// Unlocks the GED Study Coach. Failed attempts are limited per IP (in-memory,
// per instance) so a 4-digit PIN can't be brute-forced quickly.
const WINDOW_MS = 10 * 60 * 1000
const MAX_FAILS = 8
const fails = new Map<string, { count: number; resetAt: number }>()

function ip(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  return fwd ? fwd.split(',')[0].trim() : (req.headers.get('x-real-ip') ?? 'unknown')
}

export async function POST(req: NextRequest) {
  const key = ip(req)
  const now = Date.now()
  const f = fails.get(key)
  if (f && now < f.resetAt && f.count >= MAX_FAILS) {
    return NextResponse.json({ ok: false, error: 'Too many tries. Wait a few minutes.' }, { status: 429 })
  }

  let pin = ''
  try {
    const body = await req.json()
    pin = typeof body?.pin === 'string' ? body.pin.trim() : ''
  } catch {
    // fall through with empty pin
  }

  const user = /^\d{4}$/.test(pin) ? checkGedPin(pin) : null
  if (user === null) {
    const cur = f && now < f.resetAt ? f : { count: 0, resetAt: now + WINDOW_MS }
    cur.count += 1
    fails.set(key, cur)
    return NextResponse.json({ ok: false, error: 'Wrong code.' }, { status: 401 })
  }

  fails.delete(key)
  const res = NextResponse.json({ ok: true, user })
  res.cookies.set(GED_COOKIE, makeGedToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && !process.env.PRIVATE_HTTP,
    sameSite: 'lax',
    path: '/',
    maxAge: GED_TTL_MS / 1000,
  })
  return res
}
