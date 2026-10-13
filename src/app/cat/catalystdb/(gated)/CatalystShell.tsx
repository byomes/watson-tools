'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { CAT_TOOL_SECTIONS } from '@/lib/catTools'

// Left-hand tools menu for the Catalyst Database. Picking a tool loads it in an iframe in
// this same window; the database board stays mounted underneath so nothing is lost
// (filters, selection, scroll) when you come back to it.

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  )
}

export default function CatalystShell({ board, headerRight }: { board: ReactNode; headerRight: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<{ name: string; href: string } | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const choose = (tool: { name: string; href: string } | null) => {
    setActive(tool)
    if (typeof window !== 'undefined' && window.innerWidth < 768) setOpen(false)
  }

  const itemCls = (on: boolean) =>
    `block w-full text-left rounded-lg px-3 py-2 ${
      on ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
    }`

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between gap-3 px-4 py-5 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            aria-label="Tools menu"
            aria-expanded={open}
            title="Tools"
            onClick={() => setOpen((o) => !o)}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:opacity-60"
          >
            <MenuIcon />
          </button>
          <button
            type="button"
            onClick={() => choose(null)}
            className="text-lg font-semibold text-slate-900 dark:text-white hover:opacity-70 active:opacity-50 truncate"
          >
            {active ? active.name : 'Catalyst Database'}
          </button>
        </div>
        <div className="flex items-center gap-4">
          {active && (
            <a
              href={active.href}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
            >
              Open in new tab
            </a>
          )}
          {headerRight}
        </div>
      </div>

      <div className="relative flex flex-1 min-h-0">
        {open && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="md:hidden absolute inset-0 z-30 bg-black/30"
          />
        )}
        <nav
          className={`${open ? 'flex' : 'hidden'} absolute md:static z-40 inset-y-0 left-0 w-72 shrink-0 flex-col overflow-y-auto bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-2`}
        >
          <button type="button" onClick={() => choose(null)} className={itemCls(active === null)}>
            <div className="text-sm font-medium text-slate-900 dark:text-white">Catalyst Database</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Members, households, edits</div>
          </button>
          {CAT_TOOL_SECTIONS.map((sec) => (
            <div key={sec.title} className="py-1">
              <div className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {sec.title}
              </div>
              {sec.tools.map((t) => (
                <button
                  key={t.href}
                  type="button"
                  onClick={() => choose({ name: t.name, href: t.href })}
                  className={itemCls(active?.href === t.href)}
                >
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{t.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t.note}</div>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="flex-1 min-w-0 min-h-0 relative">
          <div className={active ? 'hidden' : 'h-full'}>{board}</div>
          {active && (
            <iframe
              key={active.href}
              src={active.href}
              title={active.name}
              className="absolute inset-0 h-full w-full border-0 bg-white dark:bg-slate-950"
            />
          )}
        </div>
      </div>
    </div>
  )
}
