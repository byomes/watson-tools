'use client'

import { useRef, useState, type ReactNode } from 'react'
import DeaconBoard, { type DeaconBoardHandle } from '../deacons/DeaconBoard'
import AttendanceBoard from '../attendance/AttendanceBoard'
import GroupList from '../shepherdingreport/GroupList'
import ShepherdingStats from '../shepherdingreport/ShepherdingStats'
import NotesFeed from './NotesFeed'
import { logoutAction } from './actions'
import { useDeaconTheme } from '@/lib/deaconTheme'
import type { Group, Totals } from '@/lib/shepherdingReportShared'

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

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.3 9.2a2.7 2.7 0 0 1 5.2.9c0 1.8-2.5 2-2.5 3.6" />
      <path d="M12 17.3h.01" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function HelpSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-bold text-black dark:text-white mb-1">{title}</h3>
      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1.5">{children}</div>
    </div>
  )
}

function HelpTray({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close help"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`absolute inset-x-0 top-0 max-h-[85vh] overflow-y-auto rounded-b-2xl bg-white dark:bg-gray-900 shadow-xl transition-transform duration-200 ${
          open ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-black dark:text-white">How to use this app</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="text-gray-500 dark:text-gray-400 active:opacity-60 p-1 -m-1"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-4 py-4">
          <HelpSection title="List">
            <p>Everyone in the church, grouped by who&apos;s unassigned or inactive. Search by name, or filter to just your group.</p>
            <p>Tap the phone, text, or mail icon on a card to reach someone directly. Use the note field to log that you called, texted, or visited &mdash; it stays on their card.</p>
            <p>Assign a person to a deacon, or add a spouse, child, or parent from their card to keep families linked.</p>
          </HelpSection>

          <HelpSection title="Report">
            <p><strong>Connected</strong> shows how many weeks it&apos;s been since someone attended &mdash; Current (0-1 wk), At Risk (2-3 wks), or Critical (4+ wks). Tap a box to see who&apos;s in it.</p>
            <p><strong>Consistency</strong> looks at their last 8 Sundays &mdash; Consistent, Active, Occasional, or Lapsed.</p>
            <p>If someone was actually there and the app has it wrong, tap their weeks-since badge to pick the correct date.</p>
          </HelpSection>

          <HelpSection title="Attendance">
            <p>Mark who was present for a specific Sunday with the toggle next to their name. Set a person&apos;s campus (Wilmington, Online, Hybrid, or Inactive) with the buttons beside the toggle.</p>
            <p>Filter the list by name to find someone quickly on a busy Sunday.</p>
          </HelpSection>

          <HelpSection title="Notes">
            <p>Log a quick follow-up note on anyone &mdash; a call, a text, a visit, a prayer request. Search their name, type the note, and submit.</p>
            <p>The feed below shows recent notes from you and other deacons, newest first.</p>
          </HelpSection>

          <HelpSection title="Top &amp; bottom bar">
            <p>Tap the app name to refresh. The <strong>+</strong> button adds a new person to the roster. The sun/moon icon switches light and dark mode. <strong>Log out</strong> signs you out of the app.</p>
            <p>The <strong>Watson</strong> button at the bottom right opens a Telegram chat with Watson, the church assistant &mdash; ask it questions about attendance or anyone in the directory any time.</p>
          </HelpSection>
        </div>
      </div>
    </div>
  )
}

const TABS: { id: Tab; label: string; icon: () => ReactNode }[] = [
  { id: 'deacons', label: 'List', icon: UsersIcon },
  { id: 'shepherding', label: 'Report', icon: LambIcon },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheckIcon },
  { id: 'notes', label: 'Notes', icon: NotesIcon },
]

export default function DeaconAppTabs({
  deaconName,
  shepherdingGroups,
  shepherdingTotals,
  shepherdingDate,
}: {
  deaconName: string
  shepherdingGroups: Group[] | null
  shepherdingTotals: Totals | null
  shepherdingDate: string | null
}) {
  const [tab, setTab] = useState<Tab>('shepherding')
  const [theme, toggleTheme] = useDeaconTheme()
  const [helpOpen, setHelpOpen] = useState(false)
  const boardRef = useRef<DeaconBoardHandle>(null)

  return (
    <>
      {/* h-dvh + overflow-hidden on the shell, with only the middle section
          scrolling, keeps header/footer from ever moving -- position:fixed
          for the footer used to visibly jump on iOS Safari as its address
          bar hid/showed mid-scroll. The `.dark` class itself lives on
          <html> (applied by useDeaconTheme), not here, so the phone's
          status bar / browser chrome -- which samples the real page
          background, not this div -- follows the toggle too. */}
      <div className="h-dvh bg-white dark:bg-gray-950 flex flex-col overflow-hidden">
        <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 relative">
          <h1 className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              aria-label="Refresh app"
              className="flex items-center gap-2 font-bold text-black dark:text-white active:opacity-60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/catalyst-c-logo.jpg" alt="" className="h-6 w-6 rounded-md" />
              Shepherding App
            </button>
          </h1>
          <button
            type="button"
            onClick={() => logoutAction()}
            aria-label="Log out"
            title="Log out"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-[45px] h-[45px] flex items-center justify-center text-gray-500 dark:text-gray-400 active:opacity-60"
          >
            <LogoutIcon />
          </button>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              aria-label="Help"
              title="Help"
              className="w-[45px] h-[45px] flex items-center justify-center text-gray-500 dark:text-gray-400 active:opacity-60"
            >
              <HelpIcon />
            </button>
            <button
              type="button"
              onClick={() => boardRef.current?.openAddPerson()}
              aria-label="Add new person"
              title="Add new person"
              className="w-[45px] h-[45px] flex items-center justify-center text-gray-500 dark:text-gray-400 active:opacity-60"
            >
              <PlusIcon />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-[45px] h-[45px] flex items-center justify-center text-gray-500 dark:text-gray-400 active:opacity-60"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className={tab === 'deacons' ? '' : 'hidden'}>
            <div className="max-w-6xl mx-auto">
              <DeaconBoard ref={boardRef} />
            </div>
          </div>

          <div className={tab === 'shepherding' ? '' : 'hidden'}>
            <div className="max-w-md mx-auto">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {shepherdingDate ? `Generated ${shepherdingDate}` : 'Report unavailable'} — grouped
                by deacon, most at-risk first in each group.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                Tap a weeks-since badge to update someone&apos;s last attendance date.
              </p>

              {!shepherdingGroups && (
                <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
                  Could not load the report right now. Try again shortly.
                </p>
              )}

              {shepherdingTotals && shepherdingGroups && (
                <ShepherdingStats groups={shepherdingGroups} totals={shepherdingTotals} />
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
              <NotesFeed deaconName={deaconName} />
            </div>
          </div>
        </div>

        <div className="shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex pb-[env(safe-area-inset-bottom)]">
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
          {/* Opens the deacon's own Telegram chat with Watson (@wckyWatsonbot)
              -- not an in-app tab, so it's kept out of TABS/setTab entirely.
              Telegram identifies the sender by their own logged-in account,
              so this link is the same for every deacon. */}
          <button
            type="button"
            onClick={() => window.open('https://t.me/wckyWatsonbot', '_blank', 'noopener,noreferrer')}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-[18px] transition text-gray-400 dark:text-gray-500"
          >
            <TelegramIcon />
            <span className="text-[11px] font-medium">Watson</span>
          </button>
        </div>
      </div>

      <HelpTray open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
