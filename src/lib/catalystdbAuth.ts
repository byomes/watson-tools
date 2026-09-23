import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'

// PIN gate for /cat/catalystdb -- full members-database admin screen (Bill's
// 2026-09-23 request). Own PIN (CATALYSTDB_PIN, 6 digits -- longer than the
// 4-digit scratch/deacon PINs since this one can edit every member field,
// not review a throwaway draft), same HMAC-signed-cookie pattern as
// scratchAuth.ts. Every API route under src/app/api/cat/catalystdb/* must
// call requireCatalystDBSession() itself -- the page-level gate in
// (gated)/layout.tsx does not protect API routes.

const COOKIE_NAME = 'catalystdb_session'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours -- shorter than scratch's 30 days given the blast radius here

function authSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function catalystdbPin(): string {
  const pin = process.env.CATALYSTDB_PIN
  if (!pin) throw new Error('CATALYSTDB_PIN is not set')
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
  const expected = catalystdbPin()
  const pinBuf = Buffer.from(pin)
  const expectedBuf = Buffer.from(expected)
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf)
}

function makeToken(): string {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = `catalystdb.${expires}`
  return `${payload}.${sign(payload)}`
}

function tokenValid(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [subject, expiresStr, sig] = parts
  if (subject !== 'catalystdb') return false
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

export async function requireCatalystDBSession(): Promise<boolean> {
  return isLoggedIn()
}
