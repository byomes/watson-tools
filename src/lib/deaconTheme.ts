'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'deaconapp-theme'

export type Theme = 'light' | 'dark'

function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

// Renders 'light' on the server and on first client paint (avoiding a
// hydration mismatch), then syncs to the stored preference -- falling back
// to the OS preference -- right after mount.
export function useDeaconTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = readStoredTheme()
    if (stored) {
      setTheme(stored)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [])

  function toggleTheme() {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // localStorage unavailable (private browsing, etc.) -- theme just
        // won't persist across reloads.
      }
      return next
    })
  }

  return [theme, toggleTheme]
}
