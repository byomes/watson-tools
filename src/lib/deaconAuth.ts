import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { watsonFetch } from '@/lib/watson'

// Per-deacon PIN gate for /cat/deaconapp (2026-09-07). PINs themselves
// live in deacon_pins on the Watson side (deacons_web.py verify_pin) --
// this file turns a verified deacon name into a signed session cookie
// recording WHICH deacon is in, mirroring the previous shared-PIN
// version's HMAC-signed-cookie pattern (~/micah-tasks/lib/auth.ts) but
// now carrying an identity instead of just "a PIN was entered".
//
// Two deacons could in principle still share a PIN (nothing stops it at
// the data level), so verifyPin below returns every matching name and
// the login flow may need the user to pick which of them they are -- see
// PENDING_COOKIE.
//
// 2026-09-17: the cookie also carries an opaque `sessionToken` minted by
// Watson (deacon_sessions.py) at the moment verify_pin actually matched a
// PIN. Every /api/cat/deacons/* call now forwards that token as
// X-Deacon-Session, which the Watson backend checks independently of
// DEACONS_API_KEY -- closing the gap where that one shared key was, on
// its own, enough for full read/write access to the whole roster. The
// cookie's own HMAC signature still stops a client from forging or
// altering it, but the sessionToken is what Watson itself trusts; a
// forged cookie with a made-up token would just get 401'd by Watson.

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
 * matches means wrong PIN; more than one means the caller must
 * disambiguate. `locked` means clientIp has hit 5 consecutive wrong PINs
 * (jobs/congregation/deacon_login_lockout.py) -- matches is always empty
 * in that case, and no PIN was even checked. `sessionTokens` carries one
 * opaque Watson-issued token per matched name (empty when matches is) --
 * see this file's top comment. */
export async function verifyPin(
  pin: string,
  clientIp: string,
): Promise<{ matches: string[]; locked: boolean; sessionTokens: Record<string, string> }> {
  const res = await watsonFetch('/api/cat/deacons/verify_pin', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '' },
    body: JSON.stringify({ pin, client_ip: clientIp }),
  })
  if (!res.ok) return { matches: [], locked: false, sessionTokens: {} }
  const data = await res.json().catch(() => null)
  return {
    matches: Array.isArray(data?.matches) ? data.matches : [],
    locked: Boolean(data?.locked),
    sessionTokens: data?.session_tokens && typeof data.session_tokens === 'object' ? data.session_tokens : {},
  }
}

/** Tells Watson to forget one session token -- called on logout so a
 * signed-out cookie can't still be replayed directly against the API. */
async function invalidateSessionToken(sessionToken: string): Promise<void> {
  await watsonFetch('/api/cat/deacons/logout', {
    method: 'POST',
    headers: { 'X-Watson-Key': process.env.DEACONS_API_KEY ?? '' },
    body: JSON.stringify({ session_token: sessionToken }),
  }).catch(() => {})
}

function makeToken(name: string, sessionToken: string): string {
  const expires = Date.now() + SESSION_TTL_MS
  const encodedName = Buffer.from(name, 'utf8').toString('base64url')
  const encodedSessionToken = Buffer.from(sessionToken, 'utf8').toString('base64url')
  const payload = `deacon.${encodedName}.${encodedSessionToken}.${expires}`
  return `${payload}.${sign(payload)}`
}

function tokenValid(token: string): { name: string; sessionToken: string } | null {
  const parts = token.split('.')
  if (parts.length !== 5) return null
  const [subject, encodedName, encodedSessionToken, expiresStr, sig] = parts
  if (subject !== 'deacon') return null
  if (!verifySignature(`${subject}.${encodedName}.${encodedSessionToken}.${expiresStr}`, sig)) return null
  const expires = Number(expiresStr)
  if (!Number.isFinite(expires) || Date.now() > expires) return null
  try {
    return {
      name: Buffer.from(encodedName, 'base64url').toString('utf8'),
      sessionToken: Buffer.from(encodedSessionToken, 'base64url').toString('utf8'),
    }
  } catch {
    return null
  }
}

export async function createSession(name: string, sessionToken: string) {
  const store = await cookies()
  store.set(COOKIE_NAME, makeToken(name, sessionToken), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export async function destroySession() {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  const parsed = token ? tokenValid(token) : null
  store.delete(COOKIE_NAME)
  if (parsed) await invalidateSessionToken(parsed.sessionToken)
}

/** Returns the logged-in deacon's name, or null if not logged in. */
export async function getSession(): Promise<string | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  return tokenValid(token)?.name ?? null
}

/** Returns the opaque Watson session token for X-Deacon-Session, or null
 * if not logged in -- every /api/cat/deacons/* route forwards this
 * alongside DEACONS_API_KEY. See this file's top comment. */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  return tokenValid(token)?.sessionToken ?? null
}

// --- Pending name choice, for the rare case a PIN matches more than one
// deacon ---
// Holds the PIN-verified candidate names (and their already-minted
// session tokens) for a few minutes so the picker screen can't be handed
// an identity the PIN check didn't actually produce (the cookie is
// HMAC-signed the same way the real session is).

export async function createPendingChoice(names: string[], sessionTokens: Record<string, string>) {
  const expires = Date.now() + PENDING_TTL_MS
  const encoded = Buffer.from(JSON.stringify({ names, sessionTokens }), 'utf8').toString('base64url')
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
export async function consumePendingChoice(): Promise<{ names: string[]; sessionTokens: Record<string, string> } | null> {
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
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!parsed || !Array.isArray(parsed.names)) return null
    return { names: parsed.names as string[], sessionTokens: parsed.sessionTokens ?? {} }
  } catch {
    return null
  }
}
