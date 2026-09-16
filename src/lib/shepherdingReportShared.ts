// Pure types + compute, safe to import from a 'use client' component.
// getShepherdingReport() (which needs @/lib/watson, server-only) lives in
// shepherdingReport.ts instead, which re-exports everything here.

// Neither ever comes back null as of 2026-09-16 -- every member gets an
// explicit bucket/engagement value so the totals below always sum to the
// full roster (see elder_shepherding_report.py's _bucket() and
// _member_engagement_tiers()).
export type Bucket = 'critical' | 'at_risk' | 'current'
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
      }
      return acc
    },
    { current: 0, atRisk: 0, critical: 0 },
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
