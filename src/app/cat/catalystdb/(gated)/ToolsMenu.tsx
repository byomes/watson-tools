'use client'

import { useEffect, useRef, useState } from 'react'
import { CAT_TOOL_SECTIONS } from '@/lib/catTools'

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

export default function ToolsMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Tools menu"
        aria-expanded={open}
        title="Tools"
        onClick={() => setOpen((o) => !o)}
        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:opacity-60"
      >
        <GridIcon />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-72 max-h-[80vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg p-2">
          {CAT_TOOL_SECTIONS.map((sec) => (
            <div key={sec.title} className="py-1">
              <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {sec.title}
              </div>
              {sec.tools.map((t) => (
                <a
                  key={t.href}
                  href={t.href}
                  className="block rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{t.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t.note}</div>
                </a>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
