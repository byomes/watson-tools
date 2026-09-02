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
    ];
  },
};

export default nextConfig;
