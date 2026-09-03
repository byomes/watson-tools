'use client'

import { useState, type ReactNode } from 'react'
import DeaconBoard from '../deacons/DeaconBoard'
import AttendanceBoard from '../attendance/AttendanceBoard'
import GroupList from '../shepherdingreport/GroupList'
import NotesFeed from './NotesFeed'
import { useDeaconTheme } from '@/lib/deaconTheme'
import type { Group, Totals } from '@/lib/shepherdingReport'

type Tab = 'deacons' | 'shepherding' | 'attendance' | 'notes'

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15 20c.3-2.2 1.8-4 3.8-4.4" />
    </svg>
  )
}

function LambIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="8" y="6" width="12" height="9" rx="4.5" />
      <circle cx="6.5" cy="11" r="3" />
      <path d="M4.8 9c-.8-1.1-2.2-1-2.2.3M7.3 8.3c.3-1.3-.9-2.1-1.8-1.3" />
      <path d="M10 15v3M14 15v3M18 15v3" />
    </svg>
  )
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M6 3.5h9l4 4V20a1 1 0 01-1 1H6a1 1 0 01-1-1V4.5a1 1 0 011-1z" />
      <path d="M15 3.5V7a1 1 0 001 1h4" />
      <path d="M8 12h8M8 15.5h8M8 9h4" />
    </svg>
  )
}

function CalendarCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3M16 3v3" />
      <path d="M8.5 14l2 2 4-4.2" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  )
}

const TABS: { id: Tab; label: string; icon: () => ReactNode }[] = [
  { id: 'deacons', label: 'List', icon: UsersIcon },
  { id: 'shepherding', label: 'Report', icon: LambIcon },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheckIcon },
  { id: 'notes', label: 'Notes', icon: NotesIcon },
]

export default function DeaconAppTabs({
  shepherdingGroups,
  shepherdingTotals,
  shepherdingDate,
}: {
  shepherdingGroups: Group[] | null
  shepherdingTotals: Totals | null
  shepherdingDate: string | null
}) {
  const [tab, setTab] = useState<Tab>('deacons')
  const [theme, toggleTheme] = useDeaconTheme()

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 relative">
          <h1 className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              aria-label="Refresh app"
              className="flex items-center gap-2 font-bold text-black dark:text-white active:opacity-60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/catalyst-c-logo.jpg" alt="" className="h-6 w-6 rounded-md" />
              Catalyst Shepherding App
            </button>
          </h1>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 active:opacity-60"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

        <div className="flex-1 px-4 py-6 pb-24">
          <div className={tab === 'deacons' ? '' : 'hidden'}>
            <div className="max-w-6xl mx-auto">
              <DeaconBoard />
            </div>
          </div>

          <div className={tab === 'shepherding' ? '' : 'hidden'}>
            <div className="max-w-md mx-auto">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {shepherdingDate ? `Generated ${shepherdingDate}` : 'Report unavailable'} — grouped
                by deacon, most at-risk first in each group.
              </p>

              {!shepherdingGroups && (
                <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
                  Could not load the report right now. Try again shortly.
                </p>
              )}

              {shepherdingTotals && (
                <div className="flex gap-2 mb-6 text-xs font-semibold">
                  <span className="flex-1 text-center rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 py-2">
                    2 wks {shepherdingTotals.wk2}
                  </span>
                  <span className="flex-1 text-center rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 py-2">
                    3-5 wks {shepherdingTotals.wk35}
                  </span>
                  <span className="flex-1 text-center rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 py-2">
                    6+ wks {shepherdingTotals.wk6}
                  </span>
                </div>
              )}

              {shepherdingGroups && <GroupList groups={shepherdingGroups} />}
            </div>
          </div>

          <div className={tab === 'attendance' ? '' : 'hidden'}>
            <div className="max-w-md mx-auto">
              <AttendanceBoard />
            </div>
          </div>

          <div className={tab === 'notes' ? '' : 'hidden'}>
            <div className="max-w-md mx-auto">
              <NotesFeed />
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex pb-[env(safe-area-inset-bottom)]">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-[18px] transition ${
                  active ? 'text-black dark:text-white' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <Icon />
                <span className={`text-[11px] ${active ? 'font-semibold' : 'font-medium'}`}>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
