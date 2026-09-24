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
      // micah-tasks (shared task manager for Micah and Bill) — self-hosted
      // on the Beelink as of 2026-09-24 (Next.js app + local Postgres,
      // systemd service micah-tasks.service on :3300) to drop the Neon
      // quota/cost dependency. Exposed via Tailscale Funnel on a dedicated
      // port (8443, root-mounted) rather than a path under the existing
      // :443 Funnel host, because `tailscale serve/funnel --set-path`
      // strips the mount prefix before proxying — this app's basePath
      // "/m/task" needs the full path preserved end to end. Exact-match
      // entry avoids the trailing-slash 308 loop, same as hamprep above.
      {
        source: "/m/task",
        destination: "https://watson.tail0243ff.ts.net:8443/m/task",
      },
      {
        source: "/m/task/:path+",
        destination: "https://watson.tail0243ff.ts.net:8443/m/task/:path*",
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
