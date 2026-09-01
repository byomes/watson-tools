// Server-only. Never import this from a 'use client' component.
import dns from 'node:dns';
import { Agent } from 'undici';

const WATSON_API_URL = process.env.WATSON_API_URL;

// Tailscale Funnel ingress IPs for watson.tail0243ff.ts.net, observed
// 2026-09-01 and stable across 8.8.8.8/1.1.1.1/9.9.9.9. Last-resort only —
// not cached, so real resolution keeps being retried on the next request.
const FUNNEL_FALLBACK_IPS = ['209.177.145.192', '209.177.145.97'];

// Vercel's runtime DNS resolver intermittently throws `getaddrinfo
// ENOTFOUND` for this specific hostname, in bursts from under a minute to
// 10+ minutes, independent of what's deployed — confirmed 2026-09-01 by
// reproducing it on a fresh deploy of previously-working code, then having
// it clear on its own ~30s later with no further change. The record itself
// resolves correctly and consistently from every public resolver tested,
// and the backend answers every direct check throughout.
//
// A first attempt at pinning DNS via node:dns.Resolver against 1.1.1.1/
// 8.8.8.8 (raw UDP:53) made things worse — likely blocked or slow outbound
// UDP in Vercel's sandbox, since it was only ever tested locally, where UDP
// egress is unrestricted. This version resolves over DNS-over-HTTPS instead
// (plain HTTPS to Cloudflare, port 443) — the one egress path guaranteed to
// work here, since watsonFetch's own real request depends on it too.
interface DoHAnswer {
  Answer?: { type: number; data: string }[];
}

let cachedIp: { address: string; expires: number } | null = null;
const CACHE_TTL_MS = 60_000;
const DOH_TIMEOUT_MS = 2500;
const SYSTEM_LOOKUP_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

async function resolveViaDoH(hostname: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
      { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(DOH_TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as DoHAnswer;
    return data.Answer?.find((a) => a.type === 1)?.data ?? null;
  } catch {
    return null;
  }
}

async function resolveHostname(hostname: string): Promise<string> {
  if (cachedIp && cachedIp.expires > Date.now()) return cachedIp.address;

  const viaDoH = await resolveViaDoH(hostname);
  if (viaDoH) {
    cachedIp = { address: viaDoH, expires: Date.now() + CACHE_TTL_MS };
    return viaDoH;
  }

  try {
    const { address } = await withTimeout(dns.promises.lookup(hostname), SYSTEM_LOOKUP_TIMEOUT_MS);
    cachedIp = { address, expires: Date.now() + CACHE_TTL_MS };
    return address;
  } catch {
    return FUNNEL_FALLBACK_IPS[0];
  }
}

function watsonLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void,
): void {
  resolveHostname(hostname)
    .then((address) => {
      if (options.all) callback(null, [{ address, family: 4 }]);
      else callback(null, address, 4);
    })
    .catch(() => {
      if (options.all) callback(null, FUNNEL_FALLBACK_IPS.map((address) => ({ address, family: 4 })));
      else callback(null, FUNNEL_FALLBACK_IPS[0], 4);
    });
}

const watsonAgent = new Agent({ connect: { lookup: watsonLookup } });

export async function watsonFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!WATSON_API_URL) {
    throw new Error('WATSON_API_URL must be set');
  }
  return fetch(`${WATSON_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
    // Fail fast rather than hanging until the function's own timeout —
    // comfortably above resolveHostname's own ~4.5s worst case.
    signal: init.signal ?? AbortSignal.timeout(8000),
    // @ts-expect-error -- dispatcher is undici's fetch extension, not in the DOM lib types
    dispatcher: watsonAgent,
  });
}
