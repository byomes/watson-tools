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
    ];
  },
};

export default nextConfig;
