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
import { GED_COOKIE, gedTokenValid } from "@/lib/gedAuth";

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

// PIN gate for the GED Study Coach (static files under public/ged). Page
// requests show the lock screen; asset requests get 401 until unlocked via
// /api/ged/unlock. See src/lib/gedAuth.ts.
function gedGate(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  if (path !== "/ged" && !path.startsWith("/ged/")) return null;
  if (gedTokenValid(request.cookies.get(GED_COOKIE)?.value)) return null;
  if (path === "/ged" || path === "/ged/" || path === "/ged/index.html") {
    return NextResponse.rewrite(new URL("/ged-lock.html", request.url));
  }
  return new NextResponse("Locked", { status: 401 });
}

// Church-side tools retired 2026-11-09 (Bill): the Catalyst data and every leader screen now live in 9e9 at catalyst.9e9.app.
// Temporary (302) redirects so nothing is deleted and this can be undone by removing this block.
// Kept on purpose: /cat/connect (public connect card), scratch, social, tableaccess, xmasb. /cat/papercards retired 2026-11-10 (Donna keys paper cards in 9e9).
const RETIRED_CHURCH_PAGES = [
  "/cat/deaconapp", "/cat/deaconapp-bill", "/cat/deacons", "/cat/attendance", "/cat/attsched", "/cat/kidsatt",
  "/cat/kidstoday", "/cat/serving", "/cat/group", "/cat/groups", "/cat/tracker", "/cat/shepcheck",
  "/cat/shepherdingreport", "/cat/bday", "/cat/connection", "/cat/events", "/cat/dashboard", "/cat/catalystdb", "/cat/9e9", "/cat/papercards",
];
const NINE_LIVE = "https://catalyst.9e9.app/";

function retiredChurchPage(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname.replace(/\/+$/, "");
  for (const base of RETIRED_CHURCH_PAGES) {
    if (path === base || path.startsWith(base + "/")) return NextResponse.redirect(NINE_LIVE, 302);
  }
  return null;
}

export default function proxy(request: NextRequest) {
  const retired = retiredChurchPage(request);
  if (retired) return retired;

  const gated = gedGate(request);
  if (gated) return gated;

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
