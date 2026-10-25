import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Session for /nails (Allie's intake page for Nails With Allie). The PIN and
// the lockout live on Watson (jobs/nails_intake/api.py); this file only
// signs the cookie once Watson says the PIN or the texted code was right.
// Same HMAC-cookie shape as uploadAuth.ts, signed with AUTH_SECRET.

const COOKIE_NAME = 'nails_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours, then the PIN is asked again (page is public)

function authSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', authSecret()).update(payload).digest('hex')
}

function tokenValid(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'nails') return false
  const sigBuf = Buffer.from(parts[2], 'hex')
  const expectedBuf = Buffer.from(sign(`${parts[0]}.${parts[1]}`), 'hex')
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false
  const expires = Number(parts[1])
  return Number.isFinite(expires) && Date.now() <= expires
}

export async function createSession() {
  const store = await cookies()
  const payload = `nails.${Date.now() + SESSION_TTL_MS}`
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && !process.env.PRIVATE_HTTP,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export async function isLoggedIn(): Promise<boolean> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  return !!token && tokenValid(token)
}
