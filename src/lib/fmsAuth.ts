import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { watsonFetch } from '@/lib/watson'

// FMS Finance (wtsn.me/fmsmoney) sign-in. Bill's PIN lives in FMS Books on the Watson side (scrypt hash, 2-wrong-PIN lockout per
// address, cleared only by "unlock fms" in Watson's Telegram). This file turns a verified name into a signed 12-hour cookie and
// gives server code one place to call Watson with the shared key. It has its own cookie, separate from every other PIN gate here.

const COOKIE_NAME = 'fmsmoney_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

function secretKey(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', secretKey()).update(payload).digest('hex')
}

function validSignature(payload: string, sig: string): boolean {
  const a = Buffer.from(sign(payload), 'hex')
  const b = Buffer.from(sig, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function createFmsSession(name: string) {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = `fmsmoney.${Buffer.from(name, 'utf8').toString('base64url')}.${expires}`
  const store = await cookies()
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && !process.env.PRIVATE_HTTP,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export async function destroyFmsSession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/** The signed-in user's name, or null. */
export async function getFmsUser(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 4 || parts[0] !== 'fmsmoney') return null
  const [subject, encodedName, expiresStr, sig] = parts
  if (!validSignature(`${subject}.${encodedName}.${expiresStr}`, sig)) return null
  const expires = Number(expiresStr)
  if (!Number.isFinite(expires) || Date.now() > expires) return null
  try {
    return Buffer.from(encodedName, 'base64url').toString('utf8')
  } catch {
    return null
  }
}

/** Calls the Watson FMS Finance API. `user` is sent only for signed-in calls. */
export function fmsWatson(path: string, init: RequestInit & { user?: string } = {}) {
  const { user, headers, ...rest } = init
  return watsonFetch(`/api/fmsmoney/${path}`, {
    ...rest,
    headers: {
      'X-Watson-Key': process.env.FMSMONEY_API_KEY ?? '',
      ...(user ? { 'X-FMS-User': user } : {}),
      ...((headers as Record<string, string>) ?? {}),
    },
  })
}

export async function verifyFmsPin(pin: string, clientIp: string): Promise<{ user: string | null; locked: boolean; noPin: boolean }> {
  const res = await fmsWatson('login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, client_ip: clientIp }) })
  if (!res.ok) return { user: null, locked: false, noPin: false }
  const d = await res.json().catch(() => null)
  return { user: typeof d?.user === 'string' ? d.user : null, locked: Boolean(d?.locked), noPin: Boolean(d?.no_pin) }
}
