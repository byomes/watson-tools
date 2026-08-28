// proxy.ts (Next.js 16 — project root) — supersedes the deprecated
// middleware.ts convention (see Vercel Routing Middleware docs).
//
// Baseline, app-wide IP rate limit — every route on this domain inherits
// this floor by default rather than each tool building its own (see
// WATSON_ARCHITECTURE.md's public-tools decisions). In-memory, per-instance
// sliding window: on Vercel's Fluid Compute each running instance keeps its
// own counts, so a client hitting a different instance gets a fresh bucket
// — a real but not perfectly distributed limit. That's a legitimate floor
// for a low-traffic public-tools domain, not a substitute for Vercel's own
// Firewall/WAF if traffic ever justifies more (see open questions in
// notes/wtsn-me-public-tools-spec.md).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;
// Opportunistic cleanup so a long-lived instance's Map doesn't grow
// unbounded — swept only when it's actually gotten big, not on every
// request.
const SWEEP_THRESHOLD = 5000;

const hits = new Map<string, { count: number; resetAt: number }>();

function sweepExpired(now: number): void {
  if (hits.size < SWEEP_THRESHOLD) return;
  for (const [ip, entry] of hits) {
    if (now > entry.resetAt) hits.delete(ip);
  }
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export default function proxy(request: NextRequest) {
  const now = Date.now();
  sweepExpired(now);

  const ip = clientIp(request);
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    return new NextResponse("Too many requests", { status: 429 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
