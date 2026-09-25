import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'

// PIN gate for /sms (2026-09-25) -- Watson SMS is Bill's private 1:1 texting
// tool, not a public wtsn.me/tools-registry entry, so it doesn't route
// through public_tools/requireLiveTool at all. One user, one PIN -- mirrors
// scratchAuth.ts's shape exactly rather than catalystdb's per-person one.
//
// PIN is 6 digits here (SMS_APP_PIN), not scratch's 4 -- this app carries
// real pastoral conversation content, not throwaway review copies, so the
// pin-pad UI is a 6-digit variant (see sms/login/pin-pad.tsx).

const COOKIE_NAME = 'sms_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days, same as scratch

function authSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function smsPin(): string {
  const pin = process.env.SMS_APP_PIN
  if (!pin) throw new Error('SMS_APP_PIN is not set')
  return pin
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

export function checkPin(pin: string): boolean {
  const expected = smsPin()
  const pinBuf = Buffer.from(pin)
  const expectedBuf = Buffer.from(expected)
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf)
}

function makeToken(): string {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = `sms.${expires}`
  return `${payload}.${sign(payload)}`
}

function tokenValid(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [subject, expiresStr, sig] = parts
  if (subject !== 'sms') return false
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

// Every src/app/api/sms/*/route.ts must call this itself -- the page-level
// gate in sms/(gated)/layout.tsx does not protect API routes.
export async function requireSmsSession(): Promise<boolean> {
  return isLoggedIn()
}
