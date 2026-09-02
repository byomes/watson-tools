'use client'

import { useState } from 'react'
import DeaconBoard from '../deacons/DeaconBoard'
import AttendanceBoard from '../attendance/AttendanceBoard'
import GroupList from '../shepherdingreport/GroupList'
import type { Group, Totals } from '@/lib/shepherdingReport'

type Tab = 'deacons' | 'shepherding' | 'attendance'

const TABS: { id: Tab; label: string }[] = [
  { id: 'deacons', label: 'Deacons' },
  { id: 'shepherding', label: 'Shepherding Report' },
  { id: 'attendance', label: 'Sunday Attendance' },
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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto flex items-center px-4">
          <span className="font-bold text-black mr-6 py-3">Deacon App</span>
          <div className="flex overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition ${
                  tab === t.id
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-500 hover:text-black'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
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
    </div>
  )
}
