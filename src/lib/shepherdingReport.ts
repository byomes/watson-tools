import { watsonFetch } from '@/lib/watson'

export type Bucket = '6wk' | '3-5wk' | '2wk' | null

export interface Member {
  name: string
  bucket: Bucket
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
  wk2: number
  wk35: number
  wk6: number
}

export async function getShepherdingReport(): Promise<ReportState | null> {
  const res = await watsonFetch('/api/cat/shepherdingreport/state', {
    headers: { 'X-Watson-Key': process.env.SHEPHERDING_REPORT_API_KEY ?? '' },
  })
  if (!res.ok) return null
  return res.json()
}

export function computeShepherdingTotals(groups: Group[]): Totals {
  return groups.reduce(
    (acc, g) => {
      for (const m of g.members) {
        if (m.bucket === '6wk') acc.wk6 += 1
        else if (m.bucket === '3-5wk') acc.wk35 += 1
        else if (m.bucket === '2wk') acc.wk2 += 1
      }
      return acc
    },
    { wk2: 0, wk35: 0, wk6: 0 },
  )
}
