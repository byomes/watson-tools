import { createHmac, timingSafeEqual } from 'node:crypto'

// PIN gate for /ged (GED Study Coach, static app in public/ged). Two shared
// PINs live in GED_PINS (comma-separated). Mirrors booksAuth.ts: HMAC-signed
// cookie using AUTH_SECRET. Unlike /books, the gated content is static files,
// so the check is enforced in src/proxy.ts (it runs for every /ged request).

export const GED_COOKIE = 'ged_session'
export const GED_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function authSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', authSecret()).update(payload).digest('hex')
}

export function checkGedPin(pin: string): boolean {
  const pins = (process.env.GED_PINS ?? '').split(',').map((p) => p.trim()).filter(Boolean)
  const pinBuf = Buffer.from(pin)
  // Compare against every PIN (no early exit) to keep timing uniform.
  let ok = false
  for (const p of pins) {
    const b = Buffer.from(p)
    if (b.length === pinBuf.length && timingSafeEqual(b, pinBuf)) ok = true
  }
  return ok
}

export function makeGedToken(): string {
  const payload = `ged.${Date.now() + GED_TTL_MS}`
  return `${payload}.${sign(payload)}`
}

export function gedTokenValid(token: string | undefined): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'ged') return false
  const payload = `${parts[0]}.${parts[1]}`
  const sigBuf = Buffer.from(parts[2], 'hex')
  const expectedBuf = Buffer.from(sign(payload), 'hex')
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false
  const expires = Number(parts[1])
  return Number.isFinite(expires) && Date.now() <= expires
}
