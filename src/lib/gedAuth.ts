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

// GED_USERS = "Name:PIN,Name:PIN" identifies who is studying (each person gets
// their own progress). Falls back to the anonymous GED_PINS list if unset.
function gedUsers(): { name: string; pin: string }[] {
  return (process.env.GED_USERS ?? '').split(',').map((e) => {
    const [name, pin] = e.split(':').map((x) => x.trim())
    return { name, pin }
  }).filter((u) => u.name && u.pin)
}

// Returns the matching user name ('' for an anonymous GED_PINS match), or null.
export function checkGedPin(pin: string): string | null {
  const pinBuf = Buffer.from(pin)
  const same = (p: string) => { const b = Buffer.from(p); return b.length === pinBuf.length && timingSafeEqual(b, pinBuf) }
  // Compare against every PIN (no early exit) to keep timing uniform.
  let found: string | null = null
  for (const u of gedUsers()) if (same(u.pin) && found === null) found = u.name
  for (const p of (process.env.GED_PINS ?? '').split(',').map((x) => x.trim()).filter(Boolean)) {
    if (same(p) && found === null) found = ''
  }
  return found
}

export function makeGedToken(user = ''): string {
  const payload = `ged.${encodeURIComponent(user)}.${Date.now() + GED_TTL_MS}`
  return `${payload}.${sign(payload)}`
}

// Returns the user name ('' if anonymous) for a valid token, or null if invalid.
export function gedTokenUser(token: string | undefined): string | null {
  if (!token) return null
  const parts = token.split('.')
  let payload: string, user = '', exp: string, sig: string
  if (parts.length === 3 && parts[0] === 'ged') { payload = `${parts[0]}.${parts[1]}`; exp = parts[1]; sig = parts[2] }
  else if (parts.length === 4 && parts[0] === 'ged') { payload = parts.slice(0, 3).join('.'); user = decodeURIComponent(parts[1]); exp = parts[2]; sig = parts[3] }
  else return null
  const sigBuf = Buffer.from(sig, 'hex')
  const expectedBuf = Buffer.from(sign(payload), 'hex')
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null
  const expires = Number(exp)
  return Number.isFinite(expires) && Date.now() <= expires ? user : null
}

export function gedTokenValid(token: string | undefined): boolean {
  return gedTokenUser(token) !== null
}
