'use client'

import type { ReactNode } from 'react'
import { useDeaconTheme } from '@/lib/deaconTheme'

// Applies the deacon app's stored/OS theme preference to the login screen
// (no toggle here -- that lives in DeaconAppTabs' header, post-login) so the
// PIN pad doesn't flash light before a dark-mode user signs in.
export function ThemeShell({ children }: { children: ReactNode }) {
  const [theme] = useDeaconTheme()
  return <div className={theme === 'dark' ? 'dark' : ''}>{children}</div>
}
