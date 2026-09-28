// Pure types + compute, safe to import from a 'use client' component.
// getShepherdingReport() (which needs @/lib/watson, server-only) lives in
// shepherdingReport.ts instead, which re-exports everything here.

// Neither ever comes back null as of 2026-09-16 -- every member gets an
// explicit bucket/engagement value so the totals below always sum to the
// full roster (see elder_shepherding_report.py's _bucket() and
// _member_engagement_tiers()).
export type Bucket = 'disconnected' | 'critical' | 'at_risk' | 'current'
export type Engagement = 'consistent' | 'active' | 'occasional' | 'lapsed'

export interface Member {
  id: number
  name: string
  bucket: Bucket
  days_since: number
  last_seen: string
  email: string | null
  phone: string | null
  engagement: Engagement
}

export interface Group {
  name: string
  members: Member[]
}

export interface ReportState {
  generated_date: string
  groups: Group[]
}

export interface Totals {
  current: number
  atRisk: number
  critical: number
  disconnected: number
}

export interface EngagementTotals {
  consistent: number
  active: number
  occasional: number
  lapsed: number
}

export function computeShepherdingTotals(groups: Group[]): Totals {
  return groups.reduce(
    (acc, g) => {
      for (const m of g.members) {
        if (m.bucket === 'critical') acc.critical += 1
        else if (m.bucket === 'at_risk') acc.atRisk += 1
        else if (m.bucket === 'current') acc.current += 1
        else if (m.bucket === 'disconnected') acc.disconnected += 1
      }
      return acc
    },
    { current: 0, atRisk: 0, critical: 0, disconnected: 0 },
  )
}

export function computeEngagementTotals(groups: Group[]): EngagementTotals {
  return groups.reduce(
    (acc, g) => {
      for (const m of g.members) {
        if (m.engagement === 'consistent') acc.consistent += 1
        else if (m.engagement === 'active') acc.active += 1
        else if (m.engagement === 'occasional') acc.occasional += 1
        else if (m.engagement === 'lapsed') acc.lapsed += 1
      }
      return acc
    },
    { consistent: 0, active: 0, occasional: 0, lapsed: 0 },
  )
}

// Single source of truth for the Connected (bucket) and Consistency
// (engagement) badge text/color so cat/shepherdingreport/GroupList.tsx and
// cat/deacons/DeaconBoard.tsx's List tab never drift apart -- mirrors
// jobs/congregation/elder_shepherding_report.py's bucket labels.
//
// 2026-09-28, Bill's ruling: each row is its own good-to-bad status ramp
// that escalates left to right, and the two rows must never share a hue
// (they used to both reach for amber/red, making it easy to mistake one
// row's badge for the other's at a glance). Connected gets the classic
// green/amber/orange/red alert ramp since it's literally "how urgently
// does someone need a check-in." Consistency gets a separate blue/indigo/
// violet/fuchsia ramp -- same escalating feel, zero hue overlap with
// Connected.
export const BUCKET_META: Record<Bucket, { label: string; className: string }> = {
  current: { label: '0-1 wk', className: 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border-green-300 dark:border-green-800' },
  at_risk: { label: '2-3 wks', className: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800' },
  critical: { label: '4-8 wks', className: 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800' },
  disconnected: { label: '9+ wks', className: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800' },
}

export const ENGAGEMENT_META: Record<Engagement, { label: string; className: string }> = {
  consistent: { label: 'Consistent', className: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800' },
  active: { label: 'Active', className: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800' },
  occasional: { label: 'Occasional', className: 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-800' },
  lapsed: { label: 'Lapsed', className: 'text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-300 dark:border-fuchsia-800' },
}

export function weeksLabel(daysSince: number): string {
  const weeks = Math.floor(daysSince / 7)
  return `${weeks} wk${weeks === 1 ? '' : 's'}`
}
