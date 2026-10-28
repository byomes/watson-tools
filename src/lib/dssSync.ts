'use client'

import { useEffect, useRef } from 'react'

// Keeps every DSS screen on the same data. A screen that writes calls notifyDssChanged(); every other mounted screen (other tabs of
// the dashboard, the embedded deacon app, the grid) re-reads straight away. Screens also re-read when the browser tab is shown
// again and once a minute, which covers changes made by someone else, the Telegram bot or a scheduled job.
export const DSS_EVENT = 'dss:changed'
export const DSS_POLL_MS = 60000

export function notifyDssChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(DSS_EVENT))
}

export function useDssSync(onSync: () => void, everyMs: number = DSS_POLL_MS) {
  const latest = useRef(onSync)
  useEffect(() => {
    latest.current = onSync
  })
  useEffect(() => {
    const run = () => { if (document.visibilityState === 'visible') latest.current() }
    window.addEventListener(DSS_EVENT, run)
    document.addEventListener('visibilitychange', run)
    const timer = setInterval(run, everyMs)
    return () => {
      window.removeEventListener(DSS_EVENT, run)
      document.removeEventListener('visibilitychange', run)
      clearInterval(timer)
    }
  }, [everyMs])
}
