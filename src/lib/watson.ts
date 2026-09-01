// Server-only. Never import this from a 'use client' component.
import dns from 'node:dns';
import { Agent } from 'undici';

const WATSON_API_URL = process.env.WATSON_API_URL;

// Tailscale Funnel ingress IPs for watson.tail0243ff.ts.net, observed
// 2026-09-01 and stable across 8.8.8.8/1.1.1.1/9.9.9.9. Last-resort
// fallback only if every DNS path below fails outright.
const FUNNEL_FALLBACK_IPS = ['209.177.145.192', '209.177.145.97'];

// Vercel's runtime DNS resolver has been observed to intermittently throw
// `getaddrinfo ENOTFOUND` for this specific hostname for minutes at a time
// — even though the record resolves correctly and consistently from every
// public resolver tested, and the backend answers correctly on every other
// path the whole time (reproduced repeatedly 2026-09-01: every wtsn.me tool
// 404'd, twice, surviving an earlier connection-pooling fix that targeted
// the wrong cause). Rather than trust ambient resolution at request time,
// resolve explicitly against public resolvers first, falling back to the
// system resolver and then a known-good Funnel IP.
function watsonLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void,
): void {
  const resolver = new dns.promises.Resolver({ timeout: 3000, tries: 2 });
  resolver.setServers(['1.1.1.1', '8.8.8.8']);
  resolver
    .resolve4(hostname)
    .then((addresses) => {
      if (options.all) callback(null, addresses.map((address) => ({ address, family: 4 })));
      else callback(null, addresses[0], 4);
    })
    .catch(() => {
      dns.lookup(hostname, options, (err, address, family) => {
        if (!err) {
          callback(null, address, family);
          return;
        }
        if (options.all) callback(null, FUNNEL_FALLBACK_IPS.map((address) => ({ address, family: 4 })));
        else callback(null, FUNNEL_FALLBACK_IPS[0], 4);
      });
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
    // Fail fast rather than hanging until the function's own timeout — lets
    // isToolLive's retry actually get a fresh attempt.
    signal: init.signal ?? AbortSignal.timeout(8000),
    // @ts-expect-error -- dispatcher is undici's fetch extension, not in the DOM lib types
    dispatcher: watsonAgent,
  });
}
