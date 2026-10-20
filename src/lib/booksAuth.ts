import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'

// PIN gate for /books (2026-10-16): Bill's private Zotero scan/shelf tool.
// Mirrors smsAuth.ts: one shared 6-digit PIN (BOOKS_PIN), own cookie.

const COOKIE_NAME = 'books_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days, same as scratch

function authSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function booksPin(): string {
  const pin = process.env.BOOKS_PIN
  if (!pin) throw new Error('BOOKS_PIN is not set')
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
  const expected = booksPin()
  const pinBuf = Buffer.from(pin)
  const expectedBuf = Buffer.from(expected)
  return pinBuf.length === expectedBuf.length && timingSafeEqual(pinBuf, expectedBuf)
}

function makeToken(): string {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = `books.${expires}`
  return `${payload}.${sign(payload)}`
}

function tokenValid(token: string): boolean {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [subject, expiresStr, sig] = parts
  if (subject !== 'books') return false
  if (!verifySignature(`${subject}.${expiresStr}`, sig)) return false
  const expires = Number(expiresStr)
  return Number.isFinite(expires) && Date.now() <= expires
}

export async function createSession() {
  const store = await cookies()
  store.set(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && !process.env.PRIVATE_HTTP,
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

// Every src/app/api/books/*/route.ts must call this itself -- the page-level
// gate in books/(gated)/layout.tsx does not protect API routes.
export async function requireBooksSession(): Promise<boolean> {
  return isLoggedIn()
}
