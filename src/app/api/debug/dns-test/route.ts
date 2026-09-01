import { NextResponse } from 'next/server';
import dns from 'node:dns';
import { Agent } from 'undici';

// Temporary diagnostic route -- isolates exactly which layer of the
// custom-dispatcher DNS-pinning approach crashes in this Vercel runtime.
// Two prior attempts (raw UDP resolver, then DNS-over-HTTPS) both crashed
// every wtsn.me tool with an identical "status 0, nothing logged" signature
// immediately on deploy, and `vercel logs` never surfaced a stack trace for
// either. This route wraps each layer in its own try/catch and returns the
// real error (or success) directly in the JSON body, so the failure is
// visible even if it crashes before anything would reach console.error.
// Delete once the real fix in watsonFetch is confirmed working.

const TARGET = 'https://watson.tail0243ff.ts.net/api/tools/resolve/cat/deacons';

function serializeError(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause instanceof Error ? { name: err.cause.name, message: err.cause.message } : err.cause,
    };
  }
  return { raw: String(err) };
}

async function testPlainFetch() {
  try {
    const res = await fetch(TARGET, { signal: AbortSignal.timeout(8000) });
    return { ok: true, status: res.status, body: (await res.text()).slice(0, 200) };
  } catch (err) {
    return { ok: false, error: serializeError(err) };
  }
}

async function testDefaultAgentDispatcher() {
  try {
    const agent = new Agent();
    const res = await fetch(TARGET, {
      // @ts-expect-error -- dispatcher is undici's fetch extension, not in the DOM lib types
      dispatcher: agent,
      signal: AbortSignal.timeout(8000),
    });
    return { ok: true, status: res.status, body: (await res.text()).slice(0, 200) };
  } catch (err) {
    return { ok: false, error: serializeError(err) };
  }
}

async function testCustomLookupDispatcher() {
  try {
    const agent = new Agent({
      connect: {
        lookup: (hostname, options, callback) => {
          dns.lookup(hostname, options, callback);
        },
      },
    });
    const res = await fetch(TARGET, {
      // @ts-expect-error -- dispatcher is undici's fetch extension, not in the DOM lib types
      dispatcher: agent,
      signal: AbortSignal.timeout(8000),
    });
    return { ok: true, status: res.status, body: (await res.text()).slice(0, 200) };
  } catch (err) {
    return { ok: false, error: serializeError(err) };
  }
}

export async function GET() {
  const results: Record<string, unknown> = {};

  results.plainFetch = await testPlainFetch();
  results.defaultAgentDispatcher = await testDefaultAgentDispatcher();
  results.customLookupDispatcher = await testCustomLookupDispatcher();

  return NextResponse.json(results);
}
