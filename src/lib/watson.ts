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
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
}
