'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

// THE STANDARD HEADER (Bill, 2026-11-09). Every Watson-built page gets this bar: Watson's blue (#064C7C, the colour of
// his icon), the white Watson icon and the word "Watson" next to it, left-justified. Use <WatsonBar /> on any new
// page or put it in the section layout; do not invent a different header. No 9e9 branding on Watson pages.
// Pages that carry their own header (the dashboard, the Catalyst Database shell) and the 9e9 app skip it, and it
// hides itself when the page is shown inside the dashboard.
const SKIP = ['/cat/dashboard', '/cat/9e9', '/cat/connect', '/cat/catalystdb', '/cat/deaconapp', '/cat/deaconapp-bill']

export default function WatsonBar() {
  const path = usePathname() ?? ''
  const [framed, setFramed] = useState<boolean | null>(null)
  useEffect(() => {
    try { setFramed(window.self !== window.top) } catch { setFramed(true) }
  }, [])
  if (SKIP.some((p) => path === p || path.startsWith(p + '/')) || framed) return null
  return (
    <div className="text-white shadow-sm" style={{ backgroundColor: '#064C7C', visibility: framed === null ? 'hidden' : 'visible' }}>
      <a href="/cat/dashboard" className="flex h-14 items-center gap-3 px-4 no-underline text-white" title="Back to the dashboard">
        <img src="/watson-icon-white.png" alt="Watson" className="h-9 w-auto" />
        <span className="text-lg font-semibold tracking-tight">Watson</span>
      </a>
    </div>
  )
}
