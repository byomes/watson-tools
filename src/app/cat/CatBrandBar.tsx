'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { DSS_CHURCH, DSS_TAGLINE } from '@/lib/dssConfig'

const SKIP = ['/cat/dashboard', '/cat/9e9', '/cat/connect', '/cat/catalystdb', '/cat/deaconapp']

export default function CatBrandBar() {
  const path = usePathname() ?? ''
  const [framed, setFramed] = useState<boolean | null>(null)
  useEffect(() => {
    try { setFramed(window.self !== window.top) } catch { setFramed(true) }
  }, [])
  if (SKIP.some((p) => path === p || path.startsWith(p + '/')) || framed) return null
  return (
    <div className="bg-nine text-white shadow-sm" style={{ visibility: framed === null ? 'hidden' : 'visible' }}>
      <a href="/cat/dashboard" className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 no-underline text-white" title="Back to the dashboard">
        <img src="/9e9/mark-white.png" alt="9e9" className="h-9 w-auto" />
        <span className="text-sm font-semibold">{DSS_CHURCH}</span>
        <span className="text-xs italic text-white/80">{DSS_TAGLINE}</span>
      </a>
    </div>
  )
}
