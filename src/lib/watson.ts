// Server-only. Never import this from a 'use client' component.
const WATSON_API_URL = process.env.WATSON_API_URL;

export async function watsonFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!WATSON_API_URL) {
    throw new Error('WATSON_API_URL must be set');
  }
  return fetch(`${WATSON_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      // Force a fresh connection per request instead of letting undici pool
      // a keep-alive socket to this origin. The Funnel hostname round-robins
      // across multiple public ingress IPs; a warm serverless instance that
      // pooled a connection to one which later went bad would otherwise keep
      // failing every request against it indefinitely (reproduced 2026-09-01
      // — every wtsn.me tool 404'd for ~10 minutes despite the backend
      // answering correctly on every other path, only cleared by a redeploy).
      Connection: 'close',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
    // Fail fast on a stuck/blackholed connection rather than hanging until
    // the function's own timeout — lets isToolLive's retry actually get a
    // fresh attempt instead of waiting out a dead socket twice.
    signal: init.signal ?? AbortSignal.timeout(5000),
  });
}
