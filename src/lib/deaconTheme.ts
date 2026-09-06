'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'deaconapp-theme'
const LIGHT_THEME_COLOR = '#ffffff'
const DARK_THEME_COLOR = '#030712' // matches the shell's dark:bg-gray-950

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

  // The `.dark` class has to live on <html> (shared by every tool on the
  // site, not just the Deacon App) so that the page's real background --
  // what a phone's status bar / browser chrome actually samples to tint
  // itself -- flips too, not just the deacon app's own wrapper div. The
  // theme-color meta tag is the more direct lever for that same chrome
  // tinting, so it's kept in sync alongside the class. Both are undone on
  // unmount so navigating to another tool doesn't inherit deacon app's
  // dark mode.
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
