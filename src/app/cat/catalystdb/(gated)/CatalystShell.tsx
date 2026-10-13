'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CAT_TOOL_SECTIONS, type CatTool } from '@/lib/catTools'

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

export default function CatalystShell({
  board,
  themeToggle,
  logout,
  logoutLabelled,
}: {
  board: ReactNode
  themeToggle: ReactNode
  logout: ReactNode
  logoutLabelled: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<{ name: string; href: string } | null>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  // Phone-width: land on a dashboard of big buttons instead of loading the database.
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [home, setHome] = useState(true)
  const [boardMounted, setBoardMounted] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Push this window's light/dark choice into the framed tool, now and whenever it changes.
  const sendTheme = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: 'cat-theme', dark: document.documentElement.classList.contains('dark') },
      window.location.origin,
    )
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const onDashboard = isMobile === true && home
  const showBoard = isMobile !== null && !onDashboard && !active
  useEffect(() => {
    if (showBoard) setBoardMounted(true)
  }, [showBoard])

  useEffect(() => {
    const observer = new MutationObserver(sendTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === 'cat-theme-request') sendTheme()
    }
    window.addEventListener('message', onMessage)
    return () => {
      observer.disconnect()
      window.removeEventListener('message', onMessage)
    }
  }, [sendTheme])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const choose = (tool: { name: string; href: string } | null) => {
    setActive(tool)
    setHome(false)
    if (typeof window !== 'undefined' && window.innerWidth < 768) setOpen(false)
  }

  const itemCls = (on: boolean) =>
    `block w-full text-left rounded-lg px-3 py-2 ${
      on ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
    }`

  // Flat list for the phone dashboard: sub-items become their own buttons.
  const launcherSections = CAT_TOOL_SECTIONS.map((sec) => ({
    title: sec.title,
    tools: sec.tools.flatMap((t) => (t.children ? t.children.map((c) => ({ ...c, name: `${t.name.replace(' Tracker', '')}: ${c.name}` })) : [t])),
  }))

  const renderTool = (t: CatTool) => {
    if (!t.children) {
      return (
        <button
          key={t.href}
          type="button"
          onClick={() => choose({ name: t.name, href: t.href })}
          className={itemCls(active?.href === t.href)}
        >
          <div className="text-sm font-medium text-slate-900 dark:text-white">{t.name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{t.note}</div>
        </button>
      )
    }
    const hasActiveChild = t.children.some((c) => c.href === active?.href)
    const isOpen = expanded[t.name] ?? hasActiveChild
    return (
      <div key={t.href}>
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setExpanded((e) => ({ ...e, [t.name]: !isOpen }))}
          className={`${itemCls(false)} flex items-center justify-between`}
        >
          <span>
            <span className="block text-sm font-medium text-slate-900 dark:text-white">{t.name}</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">{t.note}</span>
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-sm">{isOpen ? '\u25BE' : '\u25B8'}</span>
        </button>
        {isOpen && (
          <div className="ml-4 border-l border-slate-200 dark:border-slate-800 pl-2">
            {t.children.map((c) => (
              <button
                key={c.href}
                type="button"
                onClick={() => choose({ name: `${t.name}: ${c.name}`, href: c.href })}
                className={itemCls(active?.href === c.href)}
              >
                <div className="text-sm font-medium text-slate-900 dark:text-white">{c.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{c.note}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between gap-3 px-4 py-5 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {isMobile ? (
            !home && (
              <button
                type="button"
                aria-label="Back to dashboard"
                onClick={() => {
                  setHome(true)
                  setActive(null)
                }}
                className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white active:opacity-60"
              >
                &lsaquo; Tools
              </button>
            )
          ) : (
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
          )}
          <button
            type="button"
            onClick={() => (isMobile ? (setHome(true), setActive(null)) : choose(null))}
            className="text-lg font-semibold text-slate-900 dark:text-white hover:opacity-70 active:opacity-50 truncate"
          >
            {onDashboard ? 'Catalyst' : active ? active.name : 'Catalyst Database'}
          </button>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {active && (
            <a
              href={active.href}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
            >
              <span className="hidden sm:inline">Open in new tab</span>
              <span className="sm:hidden">New tab</span>
            </a>
          )}
          {!onDashboard && logout}
          {themeToggle}
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
          className={`${open && !isMobile ? 'flex' : 'hidden'} absolute md:static z-40 inset-y-0 left-0 w-72 shrink-0 flex-col overflow-y-auto bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-2`}
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
              {sec.tools.map((t) => renderTool(t))}
            </div>
          ))}
        </nav>

        <div className="flex-1 min-w-0 min-h-0 relative">
          {onDashboard && (
            <div className="h-full overflow-y-auto p-4 pb-10">
              <button
                type="button"
                onClick={() => choose(null)}
                className="w-full min-h-[96px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-left active:opacity-60"
              >
                <div className="text-lg font-semibold text-slate-900 dark:text-white">Catalyst Database</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Members, households, edits</div>
              </button>
              {launcherSections.map((sec) => (
                <div key={sec.title} className="mt-6">
                  <div className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {sec.title}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {sec.tools.map((t) => (
                      <button
                        key={t.href}
                        type="button"
                        onClick={() => choose({ name: t.name, href: t.href })}
                        className="min-h-[104px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-left active:opacity-60 flex flex-col justify-between"
                      >
                        <span className="text-base font-semibold leading-snug text-slate-900 dark:text-white">{t.name}</span>
                        <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="mt-8">{logoutLabelled}</div>
            </div>
          )}
          {boardMounted && <div className={showBoard ? 'h-full' : 'hidden'}>{board}</div>}
          {active && (
            <iframe
              ref={frameRef}
              onLoad={sendTheme}
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
