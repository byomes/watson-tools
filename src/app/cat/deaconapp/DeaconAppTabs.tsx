'use client'

import { useState, type ReactNode } from 'react'
import DeaconBoard from '../deacons/DeaconBoard'
import AttendanceBoard from '../attendance/AttendanceBoard'
import GroupList from '../shepherdingreport/GroupList'
import type { Group, Totals } from '@/lib/shepherdingReport'

type Tab = 'deacons' | 'shepherding' | 'attendance'

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

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.6 8 3.3 5 6.6 5c2 0 3.4 1.2 4 2.3.6-1.1 2-2.3 4-2.3 3.3 0 5 3 4.9 6.3-1.8 4.6-9.3 9.2-9.3 9.2z" />
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

const TABS: { id: Tab; label: string; icon: () => ReactNode }[] = [
  { id: 'deacons', label: 'Deacons', icon: UsersIcon },
  { id: 'shepherding', label: 'Shepherding', icon: HeartIcon },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheckIcon },
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
  const activeLabel = TABS.find((t) => t.id === tab)?.label

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-center font-bold text-black">{activeLabel}</h1>
      </div>

      <div className="flex-1 px-4 py-6 pb-24">
        <div className={tab === 'deacons' ? '' : 'hidden'}>
          <div className="max-w-6xl mx-auto">
            <DeaconBoard />
          </div>
        </div>

        <div className={tab === 'shepherding' ? '' : 'hidden'}>
          <div className="max-w-md mx-auto">
            <p className="text-sm text-gray-500 mb-4">
              {shepherdingDate ? `Generated ${shepherdingDate}` : 'Report unavailable'} — grouped
              by deacon, most at-risk first in each group.
            </p>

            {!shepherdingGroups && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                Could not load the report right now. Try again shortly.
              </p>
            )}

            {shepherdingTotals && (
              <div className="flex gap-2 mb-6 text-xs font-semibold">
                <span className="flex-1 text-center rounded-md border border-blue-200 bg-blue-50 text-blue-700 py-2">
                  2 wks {shepherdingTotals.wk2}
                </span>
                <span className="flex-1 text-center rounded-md border border-amber-300 bg-amber-50 text-amber-700 py-2">
                  3-5 wks {shepherdingTotals.wk35}
                </span>
                <span className="flex-1 text-center rounded-md border border-red-300 bg-red-50 text-red-700 py-2">
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
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition ${
                active ? 'text-black' : 'text-gray-400'
              }`}
            >
              <Icon />
              <span className={`text-[11px] ${active ? 'font-semibold' : 'font-medium'}`}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
