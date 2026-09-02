import { cookies } from 'next/headers'
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

// PIN gate for /cat/deaconapp — one shared PIN handed out to all deacons
// by Bill directly (no per-deacon accounts), so the session just records
// "PIN was entered", not who entered it. Pattern mirrors
// ~/micah-tasks/lib/auth.ts (scrypt hash, HMAC-signed cookie,
// timing-safe compares) minus the per-user id.

const COOKIE_NAME = 'deacon_app_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days — shared PIN, not a bank

function authSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function pinHash(): string {
  const hash = process.env.DEACON_APP_PIN_HASH
  if (!hash) throw new Error('DEACON_APP_PIN_HASH is not set')
  return hash
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pin, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPin(pin: string): boolean {
  const [salt, hash] = pinHash().split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(pin, salt, 32)
  const expected = Buffer.from(hash, 'hex')
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

function sign(payload: string): string {
  return createHmac('sha256', authSecret()).update(payload).digest('hex')
}

function makeToken(): string {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = `deacon.${expires}`
  return `${payload}.${sign(payload)}`
}

function tokenValid(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [subject, expiresStr, sig] = parts
  if (subject !== 'deacon') return false
  const payload = `${subject}.${expiresStr}`
  const expected = sign(payload)
  const sigBuf = Buffer.from(sig, 'hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return false
  }
  const expires = Number(expiresStr)
  if (!Number.isFinite(expires) || Date.now() > expires) return false
  return true
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

export async function getSession(): Promise<boolean> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return false
  return tokenValid(token)
}
