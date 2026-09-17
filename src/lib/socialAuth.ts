import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { verifyPin } from '@/lib/deaconAuth'

// PIN gate for /cat/social (2026-09-14). Deliberately reuses the EXISTING
// deacon PIN (1303, verified via deacons_web.py's verify_pin) rather than a
// new pins table — Bill's choice during scoping: this tool has a higher
// blast radius than deacon roster access (it can trigger real public
// Facebook/Instagram posts), but the PIN itself stays the one every deacon
// already has, not a new secret to distribute. Session cookie is entirely
// separate from deacon_app_session (own name, own HMAC payload shape) so
// the two tools' logins don't interact.

const COOKIE_NAME = 'social_dashboard_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12h — shorter than deaconapp's 30 days, since this can post publicly

function authSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', authSecret()).update(payload).digest('hex')
}

function verifySignature(payload: string, sig: string): boolean {
  const expected = sign(payload)
  const sigBuf = Buffer.from(sig, 'hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)
}

/** Checks the PIN against the same deacon_pins table deaconapp uses --
 * and so shares its per-IP lockout too (deacon_login_lockout.py), which
 * matters more here than there given this tool's larger blast radius. */
export async function checkPin(pin: string, clientIp: string): Promise<{ ok: boolean; locked: boolean }> {
  const { matches, locked } = await verifyPin(pin, clientIp)
  return { ok: matches.length > 0, locked }
}

function makeToken(): string {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = `social.${expires}`
  return `${payload}.${sign(payload)}`
}

function tokenValid(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [subject, expiresStr, sig] = parts
  if (subject !== 'social') return false
  if (!verifySignature(`${subject}.${expiresStr}`, sig)) return false
  const expires = Number(expiresStr)
  return Number.isFinite(expires) && Date.now() <= expires
}

export async function createSession() {
  const store = await cookies()
  store.set(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export async function destroySession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function isLoggedIn(): Promise<boolean> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  return !!token && tokenValid(token)
}
