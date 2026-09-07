import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { watsonFetch } from '@/lib/watson'

// Per-deacon PIN gate for /cat/deaconapp (2026-09-07). PINs themselves
// live in deacon_pins on the Watson side (deacons_web.py verify_pin) --
// this file only turns a verified deacon name into a signed session
// cookie recording WHICH deacon is in, mirroring the previous
// shared-PIN version's HMAC-signed-cookie pattern (~/micah-tasks/lib/auth.ts)
// but now carrying an identity instead of just "a PIN was entered".
//
// Multiple deacons can share one PIN during the interim rollout (everyone
// seeded with 1303 until Bill hands out individual PINs), so verifyPin
// below returns every matching name and the login flow may need the user
// to pick which of them they are -- see PENDING_COOKIE.

const COOKIE_NAME = 'deacon_app_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days — shared/simple PIN, not a bank

const PENDING_COOKIE = 'deacon_app_pending'
const PENDING_TTL_MS = 3 * 60 * 1000 // 3 minutes — just long enough to tap a name

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

/** Asks the Watson backend which deacon(s) this PIN belongs to. Empty
 * array means wrong PIN; more than one means the caller must disambiguate. */
export async function verifyPin(pin: string): Promise<string[]> {
  const res = await watsonFetch('/api/cat/deacons/verify_pin', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '' },
    body: JSON.stringify({ pin }),
  })
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  return Array.isArray(data?.matches) ? data.matches : []
}

function makeToken(name: string): string {
  const expires = Date.now() + SESSION_TTL_MS
  const encodedName = Buffer.from(name, 'utf8').toString('base64url')
  const payload = `deacon.${encodedName}.${expires}`
  return `${payload}.${sign(payload)}`
}

function tokenValid(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 4) return null
  const [subject, encodedName, expiresStr, sig] = parts
  if (subject !== 'deacon') return null
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

/** Returns the logged-in deacon's name, or null if not logged in. */
export async function getSession(): Promise<string | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  return tokenValid(token)
}

// --- Pending name choice, for the shared-PIN interim only ---
// Holds the PIN-verified candidate names for a few minutes so the picker
// screen can't be handed an identity the PIN check didn't actually
// produce (the cookie is HMAC-signed the same way the real session is).

export async function createPendingChoice(names: string[]) {
  const expires = Date.now() + PENDING_TTL_MS
  const encoded = Buffer.from(JSON.stringify(names), 'utf8').toString('base64url')
  const payload = `pending.${encoded}.${expires}`
  const store = await cookies()
  store.set(PENDING_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PENDING_TTL_MS / 1000,
  })
}

/** Reads and clears the pending choice cookie in one shot — it's single-use. */
export async function consumePendingChoice(): Promise<string[] | null> {
  const store = await cookies()
  const token = store.get(PENDING_COOKIE)?.value
  store.delete(PENDING_COOKIE)
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 4) return null
  const [subject, encoded, expiresStr, sig] = parts
  if (subject !== 'pending') return null
  if (!verifySignature(`${subject}.${encoded}.${expiresStr}`, sig)) return null
  const expires = Number(expiresStr)
  if (!Number.isFinite(expires) || Date.now() > expires) return null

  try {
    const names = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    return Array.isArray(names) ? (names as string[]) : null
  } catch {
    return null
  }
}
