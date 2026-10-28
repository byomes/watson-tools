'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Server-rendered screens (the shepherding Report) are computed once per page load. Re-run them when the tab is shown again and
// once a minute so the numbers follow assignment changes made anywhere else in the DSS. Client state on the page is kept.
export default function AutoRefresh({ everyMs = 60000 }: { everyMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const go = () => { if (document.visibilityState === 'visible') router.refresh() }
    document.addEventListener('visibilitychange', go)
    const timer = setInterval(go, everyMs)
    return () => { document.removeEventListener('visibilitychange', go); clearInterval(timer) }
  }, [router, everyMs])
  return null
}
