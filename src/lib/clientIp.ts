import { headers } from 'next/headers'

// Same x-forwarded-for/x-real-ip convention as proxy.ts's clientIp() and
// api/cat/connect/route.ts's inline version -- a Server Action has no
// NextRequest to read .headers off of directly, so this goes through
// next/headers instead. Shared by every PIN login action (deaconapp,
// social) that needs to pass the caller's IP to Watson's per-IP lockout.
export async function serverClientIp(): Promise<string> {
  const hdrs = await headers()
  const fwd = hdrs.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return hdrs.get('x-real-ip') ?? 'unknown'
}
