import type { Metadata } from 'next'
import { logoutAction } from '../actions'
import CatalystDBBoard from './CatalystDBBoard'
import ThemeToggleButton from './ThemeToggleButton'
import CatalystShell from './CatalystShell'

export const metadata: Metadata = {
  title: 'Catalyst Database',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// Logged-in person's name used to live here (a plain <span>{name}</span>
// next to a "Log out" text link) -- Bill's 2026-09-29 request drops the
// name entirely and swaps the text link for an icon-only button, matching
// ThemeToggleButton's icon-button style right next to it.
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <polyline points="15 17 20 12 15 7" />
      <line x1="20" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export default async function CatalystDBPage() {
  return (
    <CatalystShell
      board={<CatalystDBBoard />}
      themeToggle={<ThemeToggleButton />}
      logout={
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Log out"
            title="Log out"
            className="text-white/90 hover:text-white active:opacity-60"
          >
            <LogoutIcon />
          </button>
        </form>
      }
    />
  )
}
