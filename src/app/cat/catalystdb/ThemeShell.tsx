'use client'

import type { ReactNode } from 'react'
import { useCatalystDBTheme } from '@/lib/catalystdbTheme'

// Applies the stored/OS theme to the login screen (no toggle here -- that
// lives in the post-login header) so the PIN pad doesn't flash light
// before a dark-mode user logs in. Mirrors deaconapp/ThemeShell.tsx.
export function ThemeShell({ children }: { children: ReactNode }) {
  useCatalystDBTheme()
  return <>{children}</>
}
