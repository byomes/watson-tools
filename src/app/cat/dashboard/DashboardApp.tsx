'use client'

import { Fragment, useMemo, useState, type ReactNode } from 'react'
import PersonProfile from './PersonProfile'
import DeaconAppView from './DeaconAppView'
import type { Group, Totals } from '@/lib/shepherdingReportShared'
import { CareView, DeaconsView, HealthView, NineFrame, ToolsView } from './Views2'
import { GroupsView, HomeView, KidDetail, KidsView, PeopleView, ServingView } from './Views'
import { NavContext, PeopleProvider, Toaster, useHashRoute, usePeople, inputCls } from './chm'
import { DSS_NAME, DSS_CHURCH, DSS_TAGLINE, shep } from '@/lib/dssConfig'
import { ADMIN_TOOL_HREFS } from '@/lib/catTools'

// The Catalyst church-management dashboard (wtsn.me/cat/dashboard). Hash-routed so a profile or
// list is linkable and the browser Back button works; the People list stays mounted once opened
// so its filters survive a trip into a profile.

const NAV: { key: string; label: string; icon: string; roles?: string[]; app?: string }[] = [
  { key: 'home', label: 'Home', icon: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10' },
  { key: 'people', label: 'People', icon: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21a8 8 0 0 1 16 0' },
  { key: 'deacons', label: shep('Shepherd List'), icon: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z' },
  { key: 'deaconapp', label: shep('Shepherd App'), icon: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4' },
  { key: 'care', label: 'Care', icon: 'M12 21s-8-5-8-11a5 5 0 0 1 8-3 5 5 0 0 1 8 3c0 6-8 11-8 11z' },
  { key: 'kids', label: 'Kids', icon: 'M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 22v-6a6 6 0 0 1 12 0v6' },
  { key: 'groups', label: 'Groups', icon: 'M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 10a3 3 0 1 0 0-5M21 20v-2a4 4 0 0 0-3-3.9' },
  { key: 'serving', label: 'Serving', icon: 'M5 12l5 5L20 7' },
  { key: 'leadership', label: 'Leadership', app: '/cat/9e9/leadership/', icon: 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z' },
  { key: 'notifications', label: 'Notifications', app: '/cat/9e9/notifications/', icon: 'M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8zM13.7 21a2 2 0 0 1-3.4 0' },
  { key: 'forms', label: 'Forms', app: '/cat/9e9/forms/', icon: 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6' },
  { key: 'health', label: 'Data health', icon: 'M3 12h4l3-8 4 16 3-8h4' },
  { key: 'admin', label: 'Admin', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z' },
  { key: 'tools', label: 'Tools', icon: 'M14 6l4 4-9 9H5v-4zM13 7l4 4' },
]

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 md:h-5 md:w-5 shrink-0">
      <path d={d} />
    </svg>
  )
}

function GlobalSearch({ go }: { go: (r: string) => void }) {
  const { people } = usePeople()
  const [q, setQ] = useState('')
  const matches = useMemo(() => {
    const n = q.trim().toLowerCase()
    return n.length < 2 ? [] : people.filter((p) => p.name.toLowerCase().includes(n)).slice(0, 8)
  }, [q, people])
  return (
    <div className="relative flex-1 max-w-md">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a person…" aria-label="Find a person" className={`${inputCls} w-full`} />
      {q.trim().length >= 2 && matches.length === 0 && (
        <p className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg px-3 py-2 text-sm text-slate-500">No one found</p>
      )}
      {matches.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
          {matches.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => { go(`person/${p.id}`); setQ('') }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white">
                {p.name} <span className="text-xs text-slate-400">{p.connected}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type DeaconData = { groups: Group[] | null; totals: Totals | null; date: string | null }

function Shell({ user, themeToggle, logout, deacon }: { user: string; role: string; themeToggle: ReactNode; logout: ReactNode; deacon: DeaconData }) {
  const [route, goRoute] = useHashRoute()
  const [menu, setMenu] = useState(false)
  const [peopleSeen, setPeopleSeen] = useState(false)

  const go = (r: string) => {
    setMenu(false)
    goRoute(r)
  }
  const [section, a, b] = route.split('/')
  const head = section === 'person' ? 'people' : section === 'kid' ? 'kids' : section === 'tool' ? (ADMIN_TOOL_HREFS.has('/' + route.split('/').slice(1).join('/').split('?')[0]) ? 'admin' : 'tools') : section
  if (head === 'people' && !peopleSeen) setPeopleSeen(true)

  const personId = section === 'person' ? Number(a) : NaN
  const showPeopleList = head === 'people' && section !== 'person'
  const toolHref = section === 'tool' ? '/' + route.split('/').slice(1).join('/') : ''

  const nav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map((n) => (
        <Fragment key={n.key}>
          <button type="button" onClick={() => go(n.key)} aria-current={head === n.key ? 'page' : undefined}
            className={`flex items-center gap-3.5 md:gap-3 rounded-lg px-3.5 py-2.5 md:px-3 md:py-2 text-[17px] md:text-sm font-medium ${head === n.key ? 'bg-nine/10 text-nine font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <Icon d={n.icon} />{n.label}{n.app && <span className="ml-auto rounded-full bg-nine/15 px-1.5 text-[10px] font-semibold uppercase text-nine">beta</span>}
          </button>
        </Fragment>
      ))}
    </nav>
  )

  return (
    <NavContext.Provider value={{ go }}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        <aside className="hidden md:flex w-56 shrink-0 flex-col overflow-y-auto border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button type="button" onClick={() => window.location.reload()} title="Refresh" className="flex h-16 shrink-0 items-center justify-center bg-nine px-4 hover:opacity-90">
            <img src="/9e9/mark-white.png" alt={DSS_NAME} className="h-10 w-auto" />
          </button>
          {nav}
          <div className="mt-auto px-5 py-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm font-semibold">{DSS_CHURCH}</p>
            <p className="text-xs italic text-nine">{DSS_TAGLINE}</p>
          </div>
        </aside>
        {menu && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-auto">{nav}</div>
            <button type="button" aria-label="Close menu" className="flex-1 bg-black/40" onClick={() => setMenu(false)} />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="shrink-0 flex h-16 items-center gap-3 px-3 sm:px-5 bg-nine text-white shadow-sm">
            <button type="button" className="md:hidden text-white" aria-label="Menu" onClick={() => setMenu(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-6 w-6"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button type="button" onClick={() => window.location.reload()} title="Refresh" className="md:hidden shrink-0"><img src="/9e9/mark-white.png" alt={DSS_NAME} className="h-7 w-auto" /></button>
            <GlobalSearch go={go} />
            <span className="hidden sm:block flex-1" />
            <span className="hidden sm:inline text-sm text-white/90">{user}</span>
            <span className="scale-75 origin-right text-white [&_button]:!text-white/90 [&_button:hover]:!text-white">{themeToggle}</span>
            {logout}
          </header>
          <main className="flex-1 min-h-0 overflow-auto">
            {peopleSeen && <div className={showPeopleList ? 'h-full' : 'hidden'}><PeopleView onOpenProfile={(id) => go(`person/${id}`)} /></div>}
            {head === 'home' && <HomeView user={user} />}
            {section === 'person' && Number.isFinite(personId) && (
              <PersonProfile key={personId} id={personId} tab={b || 'details'} setTab={(t) => go(`person/${personId}/${t}`)} onBack={() => (window.history.length > 1 ? window.history.back() : go('people'))} />
            )}
            {section === 'kids' && <KidsView />}
            {section === 'kid' && <KidDetail id={Number(a)} onBack={() => go('kids')} />}
            {section === 'groups' && <GroupsView />}
            {section === 'serving' && <ServingView />}
            {section === 'deacons' && <DeaconsView />}
            {section === 'deaconapp' && <DeaconAppView user={user} groups={deacon.groups} totals={deacon.totals} date={deacon.date} />}
            {section === 'care' && <CareView />}
            {section === 'health' && <HealthView />}
            {NAV.filter((n) => n.app).map((n) => head === n.key && <NineFrame key={n.key} src={n.app!} />)}
            {head === 'admin' && <ToolsView admin href={toolHref} />}
            {head === 'tools' && <ToolsView href={toolHref} />}
          </main>
        </div>
      </div>
      <Toaster />
    </NavContext.Provider>
  )
}

export default function DashboardApp(props: { user: string; role: string; themeToggle: ReactNode; logout: ReactNode; deacon: DeaconData }) {
  return (
    <PeopleProvider>
      <Shell {...props} />
    </PeopleProvider>
  )
}
