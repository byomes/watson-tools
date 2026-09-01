// Server-only. Never import this from a 'use client' component.
import dns from 'node:dns';
import https from 'node:https';

const WATSON_API_URL = process.env.WATSON_API_URL;

// Tailscale Funnel ingress IPs for watson.tail0243ff.ts.net, observed
// 2026-09-01 and stable across 8.8.8.8/1.1.1.1/9.9.9.9. Used only if the
// system DNS resolver itself fails to resolve the hostname.
const FUNNEL_FALLBACK_IPS = ['209.177.145.192', '209.177.145.97'];

// Vercel's runtime DNS resolver intermittently throws `getaddrinfo
// ENOTFOUND` for this specific hostname, in bursts from under a minute to
// 10+ minutes, independent of what's deployed (confirmed 2026-09-01: it
// recurred on a fresh deploy of previously-working code, then cleared
// unprompted ~30s later with no further change -- a redeploy is not
// itself a fix, just a coincidentally-timed retry).
//
// Two earlier attempts at pinning DNS via a custom undici.Agent dispatcher
// (raw UDP resolver, then DNS-over-HTTPS) both crashed every wtsn.me tool
// immediately on deploy with `InvalidArgumentError: invalid onRequestStart
// method` -- npm's standalone undici package builds a Dispatcher with a
// different internal Handler ABI than the version bundled into this
// runtime's native fetch, and passing one into the other doesn't work.
// Confirmed via /api/debug/dns-test (safe to delete once this has run
// cleanly for a while).
//
// This version sidesteps undici entirely: node:https.request's own native
// `lookup` option has no version-matching risk since it's a stable Node
// core API, not a bundled package. Falls back to a known-good Funnel IP if
// the system resolver fails outright. The raw response is adapted into a
// standard Response object so every existing watsonFetch call site (which
// expects res.ok/res.status/res.json()) is unchanged.
function watsonLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void,
): void {
  dns.lookup(hostname, options, (err, address, family) => {
    if (!err) {
      callback(null, address, family);
      return;
    }
    if (options.all) callback(null, FUNNEL_FALLBACK_IPS.map((address) => ({ address, family: 4 })));
    else callback(null, FUNNEL_FALLBACK_IPS[0], 4);
  });
}

function headersToObject(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...headers } as Record<string, string>;
}

function nodeRequest(url: string, init: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = typeof init.body === 'string' ? init.body : undefined;
    const req = https.request(
      {
        hostname: u.hostname,
        port: u.port ? Number(u.port) : 443,
        path: u.pathname + u.search,
        method: init.method ?? 'GET',
        headers: headersToObject(init.headers),
        lookup: watsonLookup,
        timeout: 8000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (typeof value === 'string') headers.set(key, value);
            else if (Array.isArray(value)) headers.set(key, value.join(', '));
          }
          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode ?? 502,
              statusText: res.statusMessage,
              headers,
            }),
          );
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('watsonFetch request timed out')));
    if (body) req.write(body);
    req.end();
  });
}

export async function watsonFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!WATSON_API_URL) {
    throw new Error('WATSON_API_URL must be set');
  }
  return nodeRequest(`${WATSON_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...headersToObject(init.headers),
    },
  });
}
