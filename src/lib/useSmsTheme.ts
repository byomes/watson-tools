'use client'

import { useEffect, useState } from 'react'

// Mirrors useDeaconTheme (deaconTheme.ts) exactly -- same reasoning applies
// here: the `.dark` class has to live on <html> (shared by every tool on
// the site) so the page's real background, what a phone's browser chrome
// actually samples to tint itself, flips too. Both the class and the
// theme-color meta are undone on unmount so navigating to another tool
// doesn't inherit Watson SMS's dark mode.

const STORAGE_KEY = 'sms-theme'
const LIGHT_THEME_COLOR = '#F7F9F5' // matches LIGHT_COLORS.bg in SmsApp.tsx
const DARK_THEME_COLOR = '#0F130F' // matches DARK_COLORS.bg in SmsApp.tsx

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
export function useSmsTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = readStoredTheme()
    if (stored) {
      setTheme(stored)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')

    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR)

    return () => {
      document.documentElement.classList.remove('dark')
      meta?.remove()
    }
  }, [theme])

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
