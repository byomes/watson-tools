'use client'

import { createContext, useContext, type ReactNode } from 'react'

// When a host app (the Catalyst dashboard) provides an opener, shared deacon-app components
// render person names as links to that person's profile. Elsewhere there is no provider and
// PersonName renders plain children, so the standalone deacon app is unchanged.
const PersonLinkContext = createContext<((id: number) => void) | null>(null)

export const PersonLinkProvider = PersonLinkContext.Provider

export function PersonName({ id, className = '', fallback, children }: { id: number; className?: string; fallback?: ReactNode; children: ReactNode }) {
  const open = useContext(PersonLinkContext)
  if (!open || !Number.isFinite(id)) return <>{fallback ?? children}</>
  return (
    <a
      href={`#/person/${id}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        open(id)
      }}
      className={`${className} text-blue-700 dark:text-blue-400 hover:underline`}
    >
      {children}
    </a>
  )
}

export const usePersonLink = () => useContext(PersonLinkContext)
