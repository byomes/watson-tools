'use client'

import { useState, useSyncExternalStore, type ReactNode } from 'react'
import AttendanceBoard from '../attendance/AttendanceBoard'
import KidsAttendanceBoard from '../kidsatt/KidsAttendanceBoard'
import BatchImportButton from '../kidsatt/BatchImportButton'
import GroupsBoard from '../groups/GroupsBoard'
import ServingBoard from '../serving/ServingBoard'

// One place to record everything: Sunday adult attendance, kids attendance,
// small group/event attendance, and who served. Each tab is the same board
// its standalone page uses (/cat/attendance, /cat/kidsatt, /cat/groups,
// /cat/serving), so behavior and data are identical; this is only the shell.
// Same bottom-tab layout as the Shepherding App.

type Tab = 'sunday' | 'kids' | 'groups' | 'serving'

const icon = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    {children}
  </svg>
)

const TABS: { id: Tab; label: string; title: string; hint: string; icon: ReactNode }[] = [
  {
    id: 'sunday', label: 'Sunday', title: 'Sunday Attendance',
    hint: 'Tap a name to mark present or absent. Changes save immediately.',
    icon: icon(<><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M8 3v3M16 3v3M9 14.5l2 2 4-4" /></>),
  },
  {
    id: 'kids', label: 'Kids', title: 'Kids Attendance',
    hint: 'Tap a name to mark present or absent, or move a kid to a different class.',
    icon: icon(<><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /></>),
  },
  {
    id: 'groups', label: 'Groups', title: 'Group Attendance',
    hint: 'Your regulars are listed with toggles. Turn on everyone who came, and tap + Add a name for anyone new.',
    icon: icon(<><circle cx="9" cy="8" r="3" /><path d="M3.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" /><circle cx="17" cy="9" r="2.3" /><path d="M15 20c.3-2.2 1.8-4 3.8-4.4" /></>),
  },
  {
    id: 'serving', label: 'Serving', title: 'Who Served',
    hint: 'Find your team and check off everyone who actually served that Sunday.',
    icon: icon(<><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" /></>),
  },
]

function isTab(v: string | null): v is Tab {
  return TABS.some(t => t.id === v)
}

// The selected tab lives in the URL (?tab=groups) so a leader can bookmark or
// text a link straight to their tab. Read via useSyncExternalStore so SSR and
// first client render agree, with no setState-in-effect.
function subscribeToUrl(cb: () => void) {
  window.addEventListener('popstate', cb)
  return () => window.removeEventListener('popstate', cb)
}
const urlTab = () => new URLSearchParams(window.location.search).get('tab') ?? ''

export default function TrackerTabs() {
  const fromUrl = useSyncExternalStore(subscribeToUrl, urlTab, () => '')
  const [picked, setPicked] = useState<Tab | null>(null)
  const [visited, setVisited] = useState<Set<Tab>>(new Set())
  const tab: Tab = picked ?? (isTab(fromUrl) ? fromUrl : 'sunday')
  const seen = new Set(visited).add(tab)

  function choose(t: Tab) {
    setPicked(t)
    setVisited(v => new Set(v).add(t).add(tab))
    window.history.replaceState(null, '', `?tab=${t}`)
  }

  const current = TABS.find(t => t.id === tab)!
  return (
    <div className="flex flex-col h-dvh bg-white">
      <div className="shrink-0 border-b border-gray-200 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-black">{current.title}</h1>
          {tab === 'kids' && <BatchImportButton />}
        </div>
        <p className="max-w-md mx-auto text-xs text-gray-500 mt-0.5">{current.hint}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-md mx-auto">
          {/* Each board mounts the first time its tab opens, then stays mounted (hidden) so
              a half-finished search or scroll position survives switching tabs. */}
          {seen.has('sunday') && <div className={tab === 'sunday' ? '' : 'hidden'}><AttendanceBoard /></div>}
          {seen.has('kids') && <div className={tab === 'kids' ? '' : 'hidden'}><KidsAttendanceBoard /></div>}
          {seen.has('groups') && <div className={tab === 'groups' ? '' : 'hidden'}><GroupsBoard /></div>}
          {seen.has('serving') && <div className={tab === 'serving' ? '' : 'hidden'}><ServingBoard /></div>}
        </div>
      </div>

      <nav className="shrink-0 bg-white border-t border-gray-200 flex pb-[env(safe-area-inset-bottom)]">
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => choose(t.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-4 transition ${active ? 'text-black' : 'text-gray-400'}`}
            >
              {t.icon}
              <span className={`text-[11px] ${active ? 'font-semibold' : 'font-medium'}`}>{t.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
