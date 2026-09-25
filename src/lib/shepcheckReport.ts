import { watsonFetch } from '@/lib/watson'

export type ShepcheckEscalation = {
  log_id: number
  status: string
  sent_at: string
  contacted_at: string | null
  remind_at: string | null
  snooze_hours: number | null
}

export type ShepcheckEntry = {
  log_id: number
  prayer_request_id: number
  member_name: string
  request_text: string
  request_date: string | null
  deacon_name: string | null
  status: 'pending' | 'done' | 'snoozed' | 'escalated'
  sent_at: string
  contacted_at: string | null
  remind_at: string | null
  snooze_hours: number | null
  escalated_at: string | null
  escalation: ShepcheckEscalation | null
}

export async function getShepcheckReport(): Promise<ShepcheckEntry[] | null> {
  const res = await watsonFetch('/api/cat/shepcheck/state', {
    headers: { 'X-Watson-Key': process.env.SHEPCHECK_API_KEY ?? '' },
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  return Array.isArray(data?.requests) ? data.requests : null
}
