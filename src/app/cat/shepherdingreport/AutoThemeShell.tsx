'use client'

import type { ReactNode } from 'react'
import { useAutoTheme } from '@/lib/useAutoTheme'

// Applies the OS light/dark preference to this page (no manual toggle --
// see ThemeShell/useDeaconTheme in cat/deaconapp for that variant). The hook
// itself sets the `.dark` class on <html> and syncs the theme-color meta
// tag, so this component only needs to call it.
export function AutoThemeShell({ children }: { children: ReactNode }) {
  useAutoTheme()
  return <>{children}</>
}
