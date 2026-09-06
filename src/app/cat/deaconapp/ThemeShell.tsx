'use client'

import type { ReactNode } from 'react'
import { useDeaconTheme } from '@/lib/deaconTheme'

// Applies the deacon app's stored/OS theme preference to the login screen
// (no toggle here -- that lives in DeaconAppTabs' header, post-login) so the
// PIN pad doesn't flash light before a dark-mode user signs in. The hook
// itself applies the `.dark` class to <html> and syncs the theme-color meta
// tag, so this component only needs to call it -- no wrapper div required.
export function ThemeShell({ children }: { children: ReactNode }) {
  useDeaconTheme()
  return <>{children}</>
}
