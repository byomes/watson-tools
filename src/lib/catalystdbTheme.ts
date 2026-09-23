'use client'

import { useEffect, useState } from 'react'

// Own copy of deaconTheme.ts's hook (own storage key, own dark background
// color) -- same self-contained-per-app convention the rest of this
// codebase follows. Note: this also FIXES catalystdb's existing dark:
// classes, which were previously dead code -- this project's Tailwind
// dark variant is class-based (@custom-variant dark in globals.css), so
// without something toggling .dark on <html>, none of them could ever
// have activated regardless of OS preference.

const STORAGE_KEY = 'catalystdb-theme'
const LIGHT_THEME_COLOR = '#ffffff'
const DARK_THEME_COLOR = '#020617' // matches Tailwind's slate-950, this app's dark bg

export type Theme = 'light' | 'dark'

function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

export function useCatalystDBTheme(): [Theme, () => void] {
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
        // localStorage unavailable -- theme just won't persist across reloads.
      }
      return next
    })
  }

  return [theme, toggleTheme]
}
