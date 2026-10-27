import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { getSession } from '@/lib/catalystdbAuth'
import { watsonFetch } from '@/lib/watson'

// Elders sign in to the DSS dashboard (/cat/dashboard) with the PIN they already set for the deacon app (2026-10-27).
// The Watson side accepts that PIN only when it belongs to exactly one person who holds an active elder role
// (deacons_web.py elder_login). It gets its OWN cookie, separate from the Bill/Donna session on purpose: the Catalyst Database,
// attendance rules and the other PIN-gated tools check the admin session only, so an elder cookie opens the dashboard and
// nothing else. Writes that go through the admin-only routes (edit details, deactivate) stay with Bill and Donna.

const COOKIE_NAME = 'chm_elder_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

function authSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', authSecret()).update(payload).digest('hex')
}

function verifySignature(payload: string, sig: string): boolean {
  const expectedBuf = Buffer.from(sign(payload), 'hex')
  const sigBuf = Buffer.from(sig, 'hex')
  return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)
}

/** Asks Watson whether this deacon-app PIN belongs to exactly one active elder. */
export async function verifyElderPin(pin: string, clientIp: string): Promise<{ elder: string | null; locked: boolean }> {
  const res = await watsonFetch('/api/cat/deacons/elder_login', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '' },
    body: JSON.stringify({ pin, client_ip: clientIp }),
  })
  if (!res.ok) return { elder: null, locked: false }
  const data = await res.json().catch(() => null)
  return { elder: typeof data?.elder === 'string' ? data.elder : null, locked: Boolean(data?.locked) }
}

export async function createElderSession(name: string) {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = `chmelder.${Buffer.from(name, 'utf8').toString('base64url')}.${expires}`
  const store = await cookies()
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && !process.env.PRIVATE_HTTP,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export async function destroyElderSession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/** The signed-in elder's name, or null. */
export async function getElderSession(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 4 || parts[0] !== 'chmelder') return null
  const [subject, encodedName, expiresStr, sig] = parts
  if (!verifySignature(`${subject}.${encodedName}.${expiresStr}`, sig)) return null
  const expires = Number(expiresStr)
  if (!Number.isFinite(expires) || Date.now() > expires) return null
  try {
    return Buffer.from(encodedName, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

/** Anyone allowed to read the dashboard: Bill or Donna (admin session), or a signed-in elder. */
export async function hasDashboardSession(): Promise<boolean> {
  return (await getSession()) !== null || (await getElderSession()) !== null
}
