'use client'

import type { ReactNode } from 'react'
import { useAutoTheme } from '@/lib/useAutoTheme'

// Applies the OS light/dark preference to this page (no manual toggle),
// same as shepherdingreport/AutoThemeShell.tsx.
export function AutoThemeShell({ children }: { children: ReactNode }) {
  useAutoTheme()
  return <>{children}</>
}
