'use client'

import { useMemo, useState, type ReactNode } from 'react'
import PersonProfile from './PersonProfile'
import { CareView, DeaconsView, HealthView, ToolsView } from './Views2'
import { GroupsView, HomeView, KidDetail, KidsView, PeopleView, ServingView } from './Views'
import { NavContext, PeopleProvider, useHashRoute, usePeople, inputCls } from './chm'

// The Catalyst church-management dashboard (wtsn.me/cat/dashboard). Hash-routed so a profile or
// list is linkable and the browser Back button works; the People list stays mounted once opened
// so its filters survive a trip into a profile.

const NAV: { key: string; label: string; icon: string; roles?: string[] }[] = [
  { key: 'home', label: 'Home', icon: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10' },
  { key: 'people', label: 'People', icon: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21a8 8 0 0 1 16 0' },
  { key: 'deacons', label: 'Deacons', icon: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z' },
  { key: 'care', label: 'Care', icon: 'M12 21s-8-5-8-11a5 5 0 0 1 8-3 5 5 0 0 1 8 3c0 6-8 11-8 11z' },
  { key: 'kids', label: 'Kids', icon: 'M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 22v-6a6 6 0 0 1 12 0v6' },
  { key: 'groups', label: 'Groups', icon: 'M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 10a3 3 0 1 0 0-5M21 20v-2a4 4 0 0 0-3-3.9' },
  { key: 'serving', label: 'Serving', icon: 'M5 12l5 5L20 7' },
  { key: 'health', label: 'Data health', icon: 'M3 12h4l3-8 4 16 3-8h4' },
  { key: 'tools', label: 'Tools', icon: 'M14 6l4 4-9 9H5v-4zM13 7l4 4' },
]

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
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
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a person…" className={`${inputCls} w-full`} />
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

function Shell({ user, themeToggle, logout }: { user: string; role: string; themeToggle: ReactNode; logout: ReactNode }) {
  const [route, goRoute] = useHashRoute()
  const [menu, setMenu] = useState(false)
  const [peopleSeen, setPeopleSeen] = useState(false)

  const go = (r: string) => {
    setMenu(false)
    goRoute(r)
  }
  const [section, a, b] = route.split('/')
  const head = section === 'person' ? 'people' : section === 'kid' ? 'kids' : section === 'tool' ? 'tools' : section
  if (head === 'people' && !peopleSeen) setPeopleSeen(true)

  const personId = section === 'person' ? Number(a) : NaN
  const showPeopleList = head === 'people' && section !== 'person'
  const toolHref = section === 'tool' ? '/' + route.split('/').slice(1).join('/') : ''

  const nav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map((n) => (
        <button key={n.key} type="button" onClick={() => go(n.key)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${head === n.key ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
          <Icon d={n.icon} />{n.label}
        </button>
      ))}
    </nav>
  )

  return (
    <NavContext.Provider value={{ go }}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        <aside className="hidden md:flex w-52 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="px-5 py-4 text-sm font-bold">Catalyst</div>
          {nav}
        </aside>
        {menu && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div className="w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-auto">{nav}</div>
            <button type="button" aria-label="Close menu" className="flex-1 bg-black/40" onClick={() => setMenu(false)} />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="shrink-0 flex items-center gap-3 px-3 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button type="button" className="md:hidden text-slate-600 dark:text-slate-300" aria-label="Menu" onClick={() => setMenu(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-6 w-6"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <GlobalSearch go={go} />
            <span className="flex-1" />
            <span className="hidden sm:inline text-xs text-slate-400">{user}</span>
            <span className="scale-75 origin-right text-slate-500 dark:text-slate-400">{themeToggle}</span>
            {logout}
          </header>
          <main className="flex-1 min-h-0 overflow-auto">
            {peopleSeen && <div className={showPeopleList ? 'h-full' : 'hidden'}><PeopleView onOpenProfile={(id) => go(`person/${id}`)} /></div>}
            {head === 'home' && <HomeView />}
            {section === 'person' && Number.isFinite(personId) && (
              <PersonProfile key={personId} id={personId} tab={b || 'timeline'} setTab={(t) => go(`person/${personId}/${t}`)} onBack={() => (window.history.length > 1 ? window.history.back() : go('people'))} />
            )}
            {section === 'kids' && <KidsView />}
            {section === 'kid' && <KidDetail id={Number(a)} onBack={() => go('kids')} />}
            {section === 'groups' && <GroupsView />}
            {section === 'serving' && <ServingView />}
            {section === 'deacons' && <DeaconsView />}
            {section === 'care' && <CareView />}
            {section === 'health' && <HealthView />}
            {head === 'tools' && <ToolsView href={toolHref} />}
          </main>
        </div>
      </div>
    </NavContext.Provider>
  )
}

export default function DashboardApp(props: { user: string; role: string; themeToggle: ReactNode; logout: ReactNode }) {
  return (
    <PeopleProvider>
      <Shell {...props} />
    </PeopleProvider>
  )
}
