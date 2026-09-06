'use client'

import { useEffect } from 'react'

const LIGHT_THEME_COLOR = '#ffffff'
const DARK_THEME_COLOR = '#030712' // matches dark:bg-gray-950 used across the site

// System-preference-only counterpart to deaconTheme.ts's useDeaconTheme (which
// adds a manual toggle + localStorage on top of this same mechanism). Applies
// `.dark` to <html> -- not a wrapper div -- so a phone's status bar / browser
// chrome, which samples the real page background, follows prefers-color-scheme
// live, and keeps a theme-color meta tag in sync for the same reason. Cleans
// up on unmount so navigating to another tool doesn't leak dark mode into
// pages that share the same <html>.
export function useAutoTheme(): void {
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = (isDark: boolean) => {
      document.documentElement.classList.toggle('dark', isDark)

      let meta = document.querySelector('meta[name="theme-color"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'theme-color')
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR)
    }

    const onChange = (e: MediaQueryListEvent) => apply(e.matches)

    apply(mql.matches)
    mql.addEventListener('change', onChange)

    return () => {
      mql.removeEventListener('change', onChange)
      document.documentElement.classList.remove('dark')
      document.querySelector('meta[name="theme-color"]')?.remove()
    }
  }, [])
}
