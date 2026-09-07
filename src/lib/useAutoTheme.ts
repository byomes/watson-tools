'use client'

import { useEffect } from 'react'

// System-preference-only counterpart to deaconTheme.ts's useDeaconTheme (which
// adds a manual toggle + localStorage on top of a similar mechanism). Applies
// `.dark` to <html> -- not a wrapper div -- so this page's own dark: Tailwind
// classes actually activate (dark mode here is class-based, not media-based).
// Cleans up on unmount so navigating to another tool doesn't leak dark mode
// into pages that share the same <html>.
//
// Does NOT touch the theme-color meta tag -- iOS Safari only honors that tag
// as parsed from the initial HTML for tinting its own chrome; mutating it
// from JS after hydration has no effect there. The page's `viewport` export
// (see page.tsx) instead ships two static theme-color meta tags with
// `media` attributes, which both Safari and Chrome do re-evaluate live as
// the OS setting changes.
export function useAutoTheme(): void {
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (isDark: boolean) => document.documentElement.classList.toggle('dark', isDark)
    const onChange = (e: MediaQueryListEvent) => apply(e.matches)

    apply(mql.matches)
    mql.addEventListener('change', onChange)

    return () => {
      mql.removeEventListener('change', onChange)
      document.documentElement.classList.remove('dark')
    }
  }, [])
}
