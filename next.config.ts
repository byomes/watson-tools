import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // hamprep (Technician exam prep) lives as its own separate Vercel
  // project/Neon DB, not folded into this app's public_tools registry.
  // It's built with basePath: "/ham", so its own links/assets already
  // carry this prefix — the destination just needs to match.
  async rewrites() {
    return [
      // Exact-match /ham separately: "/ham/:path*" alone rewrites a bare
      // /ham request to ".../ham/" (trailing slash), which hamprep then
      // 308s back to "/ham" — a redirect loop on the primary entry URL.
      {
        source: "/ham",
        destination: "https://hamprep-phi.vercel.app/ham",
      },
      {
        source: "/ham/:path+",
        destination: "https://hamprep-phi.vercel.app/ham/:path*",
      },
      // micah-tasks (shared task manager for Micah and Bill) — same
      // pattern as hamprep above: own Vercel project/Neon DB, basePath
      // "/m/task" (Micah's own /m directory), exact-match entry to avoid
      // the trailing-slash 308 loop.
      {
        source: "/m/task",
        destination: "https://micah-tasks.vercel.app/m/task",
      },
      {
        source: "/m/task/:path+",
        destination: "https://micah-tasks.vercel.app/m/task/:path*",
      },
      // curator (book-tracking app for Mel + daughters) — same pattern as
      // hamprep/micah-tasks above: own Vercel project/SQLite-via-Watson
      // backend, basePath "/curator", exact-match entry to avoid the
      // trailing-slash 308 loop. curator-watson.vercel.app (not the
      // formerly-documented curator-iota.vercel.app) is the canonical
      // alias as of 2026-09-04 — Vercel now 307s curator-iota to this one,
      // and a rewrite destination that itself redirects would leak the
      // raw .vercel.app host to the browser instead of proxying cleanly.
      {
        source: "/curator",
        destination: "https://curator-watson.vercel.app/curator",
      },
      {
        source: "/curator/:path+",
        destination: "https://curator-watson.vercel.app/curator/:path*",
      },
    ];
  },
};

export default nextConfig;
