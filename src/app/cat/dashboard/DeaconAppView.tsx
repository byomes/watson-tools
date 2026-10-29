'use client'

import { useRef, useState } from 'react'
import DeaconBoard, { type DeaconBoardHandle } from '../deacons/DeaconBoard'
import AttendanceBoard from '../attendance/AttendanceBoard'
import GroupList from '../shepherdingreport/GroupList'
import ShepherdingStats from '../shepherdingreport/ShepherdingStats'
import NotesFeed from '../deaconapp/NotesFeed'
import { PersonLinkProvider } from '@/lib/personLink'
import type { Group, Totals } from '@/lib/shepherdingReportShared'
import { useNav } from './chm'
import AutoRefresh from '@/components/AutoRefresh'
import { shep } from '@/lib/dssConfig'

// The whole deacon (shepherding) app as one dashboard screen. Same components the phone app
// renders; a PersonLinkProvider turns every person name inside into a link to their profile.

type Tab = 'deacons' | 'shepherding' | 'attendance' | 'notes'
const TABS: { id: Tab; label: string }[] = [
  { id: 'shepherding', label: 'Report' },
  { id: 'deacons', label: 'List' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'notes', label: 'Notes' },
]

export default function DeaconAppView({
  user,
  groups,
  totals,
  date,
}: {
  user: string
  groups: Group[] | null
  totals: Totals | null
  date: string | null
}) {
  const { go } = useNav()
  const [tab, setTab] = useState<Tab>('shepherding')
  const boardRef = useRef<DeaconBoardHandle>(null)

  return (
    <PersonLinkProvider value={(id) => go(`person/${id}`)}>
      <AutoRefresh />
      <div className="p-3 sm:p-5">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === t.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
            >
              {t.label}
            </button>
          ))}
          <span className="flex-1" />
          {tab === 'deacons' && (
            <button type="button" onClick={() => boardRef.current?.openAddPerson()} className="rounded-full px-4 py-1.5 text-sm font-medium bg-blue-700 text-white">
              + Add person
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 mb-4">Click any name to open their profile and timeline.</p>

        <div className={tab === 'deacons' ? '' : 'hidden'}>
          <div className="max-w-6xl mx-auto"><DeaconBoard ref={boardRef} /></div>
        </div>
        <div className={tab === 'shepherding' ? '' : 'hidden'}>
          <div className="max-w-md mx-auto">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {date ? `Generated ${date}` : 'Report unavailable'} — grouped by {shep('shepherd')}, most at-risk first in each group.
            </p>
            {!groups && <p className="text-sm text-red-700 dark:text-red-300">Could not load the report right now. Try again shortly.</p>}
            {totals && groups && <ShepherdingStats groups={groups} totals={totals} />}
            {groups && <GroupList groups={groups} smsMode="webapp" />}
          </div>
        </div>
        <div className={tab === 'attendance' ? '' : 'hidden'}>
          <div className="max-w-md mx-auto"><AttendanceBoard /></div>
        </div>
        <div className={tab === 'notes' ? '' : 'hidden'}>
          <div className="max-w-md mx-auto"><NotesFeed deaconName={user || 'Bill'} /></div>
        </div>
      </div>
    </PersonLinkProvider>
  )
}
