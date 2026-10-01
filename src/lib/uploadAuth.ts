import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'

// PIN gate for /upload (2026-10-01) -- a blank, general-purpose personal
// dropbox: one file + an optional project note, dropped into a watched
// folder on Watson. Mirrors scratchAuth.ts's shape (the closest existing
// pattern: a single shared 4-digit PIN, no per-tool live-gate, no per-IP
// lockout) rather than deacon/shepcheck's multi-person PIN-list auth,
// since this is Bill's own personal page, not a shared staff tool.
//
// Deliberately its own PIN (UPLOAD_PIN) rather than reusing SCRATCH_PIN or
// any other -- this codebase's one-PIN-per-surface convention -- even
// though its *value* happens to match SMS_APP_PIN by Bill's own choice.

const COOKIE_NAME = 'upload_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days -- personal page, not a bank

function authSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function uploadPin(): string {
  const pin = process.env.UPLOAD_PIN
  if (!pin) throw new Error('UPLOAD_PIN is not set')
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
  const expected = uploadPin()
  const pinBuf = Buffer.from(pin)
  const expectedBuf = Buffer.from(expected)
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf)
}

function makeToken(): string {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = `upload.${expires}`
  return `${payload}.${sign(payload)}`
}

function tokenValid(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [subject, expiresStr, sig] = parts
  if (subject !== 'upload') return false
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

// The page-level gate in (gated)/layout.tsx does NOT protect
// src/app/api/upload/route.ts -- that route must call this itself before
// doing anything (same lesson as requireLiveTool.ts / scratchAuth.ts's
// requireScratchSession).
export async function requireUploadSession(): Promise<boolean> {
  return isLoggedIn()
}
