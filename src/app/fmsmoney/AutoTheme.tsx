'use client'

import type { ReactNode } from 'react'
import { useAutoTheme } from '@/lib/useAutoTheme'

export default function AutoTheme({ children }: { children: ReactNode }) {
  useAutoTheme()
  return <>{children}</>
}
