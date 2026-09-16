'use client'

import { useState } from 'react'
import { computeEngagementTotals, type Group, type Member, type Totals } from '@/lib/shepherdingReportShared'

type LabelKey = 'current' | 'atRisk' | 'critical' | 'consistent' | 'active' | 'occasional' | 'lapsed'

type MemberWithGroup = Member & { groupName: string }

function membersForLabel(key: LabelKey, allMembers: MemberWithGroup[]): MemberWithGroup[] {
  const matches = allMembers.filter((m) => {
    switch (key) {
      case 'current': return m.bucket === 'current'
      case 'atRisk': return m.bucket === 'at_risk'
      case 'critical': return m.bucket === 'critical'
      case 'consistent': return m.engagement === 'consistent'
      case 'active': return m.engagement === 'active'
      case 'occasional': return m.engagement === 'occasional'
      case 'lapsed': return m.engagement === 'lapsed'
    }
  })
  return matches.sort((a, b) => a.name.localeCompare(b.name))
}

// Full-width panel rendered below whichever stat-box row owns the tapped
// label -- shared by the bucket row (Connected) and engagement row
// (Consistency) since both just need name + which deacon's group.
function LabelPeopleList({ members }: { members: MemberWithGroup[] }) {
  if (members.length === 0) {
    return (
      <p className="text-xs text-gray-400 dark:text-gray-500 px-3 py-2">
        No one in this group right now.
      </p>
    )
  }
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {members.map((m) => (
        <li key={m.id} className="px-3 py-2 flex items-center justify-between gap-3 text-sm">
          <span className="flex-1 min-w-0 truncate text-gray-900 dark:text-gray-100">{m.name}</span>
          <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{m.groupName}</span>
        </li>
      ))}
    </ul>
  )
}

// Rendered by both cat/shepherdingreport/page.tsx (the standalone report)
// and cat/deaconapp/DeaconAppTabs.tsx's Report tab -- same live totals,
// same tap-to-expand behavior, one place to keep them in sync.
export default function ShepherdingStats({ groups, totals }: { groups: Group[]; totals: Totals }) {
  const engagementTotals = computeEngagementTotals(groups)
  const [expandedLabel, setExpandedLabel] = useState<LabelKey | null>(null)
  const toggleLabel = (key: LabelKey) => setExpandedLabel((prev) => (prev === key ? null : key))
  const allMembers: MemberWithGroup[] = groups.flatMap((g) => g.members.map((m) => ({ ...m, groupName: g.name })))

  return (
    <>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Connected
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">
          Tracks the number of weeks since a person attended a Sunday service.
        </p>
        <div className="flex gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => toggleLabel('current')}
            aria-expanded={expandedLabel === 'current'}
            className="flex-1 flex flex-col gap-1 text-left"
          >
            <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300 underline decoration-dotted underline-offset-2">
              Current
            </span>
            <span
              className={`flex flex-col items-center gap-0.5 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 py-2 ${expandedLabel === 'current' ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}`}
            >
              <span>0-1 wk</span>
              <span className="text-sm font-bold">{totals.current}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => toggleLabel('atRisk')}
            aria-expanded={expandedLabel === 'atRisk'}
            className="flex-1 flex flex-col gap-1 text-left"
          >
            <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 underline decoration-dotted underline-offset-2">
              At Risk
            </span>
            <span
              className={`flex flex-col items-center gap-0.5 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 py-2 ${expandedLabel === 'atRisk' ? 'ring-2 ring-amber-400 dark:ring-amber-500' : ''}`}
            >
              <span>2-3 wks</span>
              <span className="text-sm font-bold">{totals.atRisk}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => toggleLabel('critical')}
            aria-expanded={expandedLabel === 'critical'}
            className="flex-1 flex flex-col gap-1 text-left"
          >
            <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300 underline decoration-dotted underline-offset-2">
              Critical
            </span>
            <span
              className={`flex flex-col items-center gap-0.5 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 py-2 ${expandedLabel === 'critical' ? 'ring-2 ring-red-400 dark:ring-red-500' : ''}`}
            >
              <span>4+ wks</span>
              <span className="text-sm font-bold">{totals.critical}</span>
            </span>
          </button>
        </div>
        {(expandedLabel === 'current' || expandedLabel === 'atRisk' || expandedLabel === 'critical') && (
          <div className="w-full mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <LabelPeopleList members={membersForLabel(expandedLabel, allMembers)} />
          </div>
        )}
      </div>

      {/* Same consistent/active/occasional/lapsed classification Watson's
          weekly State of the Church email uses (last 8 Sunday services),
          styled to match the Current/At Risk/Critical boxes above -- shown
          per-person as a badge under each name's last-seen pill in
          GroupList. Live counts computed client-side from the same
          per-member `engagement` field via computeEngagementTotals. */}
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Consistency
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">
          Tracks a person&apos;s attendance over the last 8 weeks.
        </p>
        <div className="flex gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => toggleLabel('consistent')}
            aria-expanded={expandedLabel === 'consistent'}
            className="flex-1 flex flex-col gap-1 text-left"
          >
            <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-green-700 dark:text-green-300 underline decoration-dotted underline-offset-2">
              Consistent
            </span>
            <span
              className={`flex flex-col items-center gap-0.5 rounded-md border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 py-2 ${expandedLabel === 'consistent' ? 'ring-2 ring-green-400 dark:ring-green-500' : ''}`}
            >
              <span>6+ / 8 wks</span>
              <span className="text-sm font-bold">{engagementTotals.consistent}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => toggleLabel('active')}
            aria-expanded={expandedLabel === 'active'}
            className="flex-1 flex flex-col gap-1 text-left"
          >
            <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300 underline decoration-dotted underline-offset-2">
              Active
            </span>
            <span
              className={`flex flex-col items-center gap-0.5 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 py-2 ${expandedLabel === 'active' ? 'ring-2 ring-amber-400 dark:ring-amber-500' : ''}`}
            >
              <span>3-5 / 8 wks</span>
              <span className="text-sm font-bold">{engagementTotals.active}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => toggleLabel('occasional')}
            aria-expanded={expandedLabel === 'occasional'}
            className="flex-1 flex flex-col gap-1 text-left"
          >
            <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300 underline decoration-dotted underline-offset-2">
              Occasional
            </span>
            <span
              className={`flex flex-col items-center gap-0.5 rounded-md border border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 py-2 ${expandedLabel === 'occasional' ? 'ring-2 ring-orange-400 dark:ring-orange-500' : ''}`}
            >
              <span>1-2 / 8 wks</span>
              <span className="text-sm font-bold">{engagementTotals.occasional}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => toggleLabel('lapsed')}
            aria-expanded={expandedLabel === 'lapsed'}
            className="flex-1 flex flex-col gap-1 text-left"
          >
            <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300 underline decoration-dotted underline-offset-2">
              Lapsed
            </span>
            <span
              className={`flex flex-col items-center gap-0.5 rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 py-2 ${expandedLabel === 'lapsed' ? 'ring-2 ring-red-400 dark:ring-red-500' : ''}`}
            >
              <span>0 / 8 wks</span>
              <span className="text-sm font-bold">{engagementTotals.lapsed}</span>
            </span>
          </button>
        </div>
        {(expandedLabel === 'consistent' || expandedLabel === 'active' || expandedLabel === 'occasional' || expandedLabel === 'lapsed') && (
          <div className="w-full mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <LabelPeopleList members={membersForLabel(expandedLabel, allMembers)} />
          </div>
        )}
      </div>
    </>
  )
}
