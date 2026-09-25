import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { watsonFetch } from '@/lib/watson'

// Per-person PIN gate for /cat/shepcheck (2026-09-24, elder-level prayer-
// contact accountability report -- trial phase for Bill and Jim). Mirrors
// catalystdbAuth.ts exactly: PINs live in shepcheck_pins on the Watson side
// (shepcheck_web.py verify_pin), this file turns a verified person name
// into a signed session cookie. A signed cookie naming who logged in is
// enough on its own -- this has a small known set of elders, not a whole
// deacon roster needing session revocation machinery.
//
// Every API route under src/app/api/cat/shepcheck/* must call
// requireShepcheckSession() itself -- the page-level gate in
// (gated)/layout.tsx does not protect API routes.

const COOKIE_NAME = 'shepcheck_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours -- pastoral contact info behind this, not a scratch page

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

/** Asks the Watson backend which person this PIN belongs to. Empty matches
 * means wrong PIN; `locked` means clientIp has hit
 * shepcheck_login_lockout.MAX_FAILED_ATTEMPTS (3) consecutive wrong
 * PINs -- matches is always empty in that case, and no PIN was even
 * checked. */
export async function verifyPin(pin: string, clientIp: string): Promise<{ matches: string[]; locked: boolean }> {
  const res = await watsonFetch('/api/cat/shepcheck/verify_pin', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.SHEPCHECK_API_KEY ?? '' },
    body: JSON.stringify({ pin, client_ip: clientIp }),
  })
  if (!res.ok) return { matches: [], locked: false }
  const data = await res.json().catch(() => null)
  return {
    matches: Array.isArray(data?.matches) ? data.matches : [],
    locked: Boolean(data?.locked),
  }
}

function makeToken(name: string): string {
  const expires = Date.now() + SESSION_TTL_MS
  const encodedName = Buffer.from(name, 'utf8').toString('base64url')
  const payload = `shepcheck.${encodedName}.${expires}`
  return `${payload}.${sign(payload)}`
}

function tokenValid(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 4) return null
  const [subject, encodedName, expiresStr, sig] = parts
  if (subject !== 'shepcheck') return null
  if (!verifySignature(`${subject}.${encodedName}.${expiresStr}`, sig)) return null
  const expires = Number(expiresStr)
  if (!Number.isFinite(expires) || Date.now() > expires) return null
  try {
    return Buffer.from(encodedName, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

export async function createSession(name: string) {
  const store = await cookies()
  store.set(COOKIE_NAME, makeToken(name), {
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

/** Returns the logged-in person's name, or null if not logged in. */
export async function getSession(): Promise<string | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  return tokenValid(token)
}

export async function isLoggedIn(): Promise<boolean> {
  return (await getSession()) !== null
}

export async function requireShepcheckSession(): Promise<boolean> {
  return isLoggedIn()
}
