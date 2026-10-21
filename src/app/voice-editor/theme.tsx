'use client'

import { useEffect, useState } from 'react'

// Light/dark for the voice editor. Follows the OS until Bill taps the toggle,
// then his choice sticks (localStorage). `.dark` goes on <html>, not a wrapper,
// so the real page background flips; the static theme-color tags live in
// layout.tsx's viewport export (Safari ignores JS-edited ones).
const KEY = 'voice-editor-theme'
type Theme = 'light' | 'dark'

function stored(): Theme | null {
  try {
    const v = window.localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (t: Theme) => {
      setTheme(t)
      document.documentElement.classList.toggle('dark', t === 'dark')
    }
    apply(stored() ?? systemTheme())
    const onChange = () => {
      if (!stored()) apply(systemTheme())
    }
    mql.addEventListener('change', onChange)
    return () => {
      mql.removeEventListener('change', onChange)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      window.localStorage.setItem(KEY, next)
    } catch {
      // Private browsing: choice just won't persist.
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={className}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
