import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'

// PIN gate for /cat/scratch/* (2026-09-23) -- the standing "review a draft
// on the real wtsn.me domain" area, so a team member (Donna, Tyler, etc.)
// can open a work-in-progress page from a plain link without a Vercel
// account. This deliberately does NOT reuse the deacon PIN (socialAuth.ts's
// reasoning) -- scratch pages are unrelated to deacon/roster access and may
// be shared with people who aren't deacons, so it gets its own PIN
// (SCRATCH_PIN) and its own session cookie.
//
// No per-IP lockout here (unlike deaconAuth/socialAuth) -- scratch pages
// are throwaway review copies with no real data behind them by convention
// (see the README-equivalent comment in src/app/cat/scratch/(gated)/layout.tsx),
// so the blast radius of someone brute-forcing a 4-digit PIN is low. Revisit
// if that convention ever changes.

const COOKIE_NAME = 'scratch_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days -- shared casual PIN, not a bank

function authSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function scratchPin(): string {
  const pin = process.env.SCRATCH_PIN
  if (!pin) throw new Error('SCRATCH_PIN is not set')
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
  const expected = scratchPin()
  const pinBuf = Buffer.from(pin)
  const expectedBuf = Buffer.from(expected)
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf)
}

function makeToken(): string {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = `scratch.${expires}`
  return `${payload}.${sign(payload)}`
}

function tokenValid(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [subject, expiresStr, sig] = parts
  if (subject !== 'scratch') return false
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

// For any src/app/api/cat/scratch/*/route.ts -- the page-level gate in
// (gated)/layout.tsx does NOT protect API routes (same lesson as
// requireLiveTool.ts), so every scratch API route must call this itself
// before doing anything.
export async function requireScratchSession(): Promise<boolean> {
  return isLoggedIn()
}
