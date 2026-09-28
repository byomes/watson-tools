'use client'

import { useEffect, useState } from 'react'

interface RegistrationSummary {
  id: number
  name: string | null
  email: string | null
  phone: string | null
  ticket_type: string | null
  num_tickets: number
  source: string
  submitted_at: string | null
}

interface Pair {
  flag_id: number
  event_id: number
  event_name: string
  reason: string
  created_at: string
  registration_a: RegistrationSummary
  registration_b: RegistrationSummary
}

const REASON_LABEL: Record<string, string> = {
  email: 'Same email',
  phone: 'Same phone',
  name_exact: 'Same name',
  name_fuzzy: 'Similar name',
}

interface ConfirmState {
  flagId: number
  keep: RegistrationSummary
  drop: RegistrationSummary
  numTickets: number
}

function RegistrationCard({ r }: { r: RegistrationSummary }) {
  return (
    <div className="flex-1 border border-gray-200 rounded-lg p-3">
      <div className="font-semibold text-black">{r.name || 'no name'}</div>
      <div className="text-sm text-gray-600">{r.email || '—'}</div>
      <div className="text-sm text-gray-600">{r.phone || '—'}</div>
      <div className="text-xs text-gray-400 mt-1">
        {r.num_tickets} ticket{r.num_tickets === 1 ? '' : 's'} · {r.ticket_type || 'no ticket type'} ·{' '}
        {r.source} · {r.submitted_at || 'no submit date'}
      </div>
    </div>
  )
}

export default function EventDuplicateReviewBoard() {
  const [pairs, setPairs] = useState<Pair[] | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rescanning, setRescanning] = useState(false)

  const load = async () => {
    setError(null)
    const res = await fetch('/api/cat/event-duplicates/list')
    if (!res.ok) {
      setError('Could not load duplicates. Try refreshing.')
      return
    }
    const body = await res.json()
    setPairs(body.pairs)
  }

  useEffect(() => {
    load()
  }, [])

  const handleRescan = async () => {
    setRescanning(true)
    setError(null)
    const res = await fetch('/api/cat/event-duplicates/rescan', { method: 'POST' })
    setRescanning(false)
    if (!res.ok) {
      setError('Rescan failed.')
      return
    }
    await load()
  }

  const handleDismiss = async (flagId: number) => {
    setBusy(flagId)
    setError(null)
    const res = await fetch('/api/cat/event-duplicates/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag_id: flagId }),
    })
    setBusy(null)
    if (!res.ok) {
      setError('Could not dismiss. Try again.')
      return
    }
    setPairs((prev) => prev?.filter((p) => p.flag_id !== flagId) ?? null)
  }

  const openConfirm = (pair: Pair, keepSide: 'a' | 'b') => {
    const keep = keepSide === 'a' ? pair.registration_a : pair.registration_b
    const drop = keepSide === 'a' ? pair.registration_b : pair.registration_a
    setConfirm({ flagId: pair.flag_id, keep, drop, numTickets: keep.num_tickets })
  }

  const handleMerge = async () => {
    if (!confirm) return
    setBusy(confirm.flagId)
    setError(null)
    const res = await fetch('/api/cat/event-duplicates/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flag_id: confirm.flagId,
        keep_id: confirm.keep.id,
        merge_id: confirm.drop.id,
        num_tickets: confirm.numTickets,
      }),
    })
    setBusy(null)
    if (!res.ok) {
      setError('Merge failed. Try again.')
      return
    }
    setPairs((prev) => prev?.filter((p) => p.flag_id !== confirm.flagId) ?? null)
    setConfirm(null)
  }

  if (confirm) {
    return (
      <div className="border border-gray-300 rounded-lg p-4">
        <h2 className="font-semibold text-black mb-2">Confirm merge</h2>
        <p className="text-sm text-gray-600 mb-3">
          Keeping <b>{confirm.keep.name || 'this registration'}</b> (id {confirm.keep.id}) — any
          blank details will be filled in from <b>{confirm.drop.name || 'the other registration'}</b>{' '}
          (id {confirm.drop.id}), and that row will be deleted. This can&apos;t be undone.
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Final ticket count</label>
        <input
          type="number"
          min={0}
          value={confirm.numTickets}
          onChange={(e) => setConfirm({ ...confirm, numTickets: Number(e.target.value) })}
          className="w-full mb-4 border border-gray-300 rounded-lg px-3 py-2 text-black"
        />
        <div className="flex gap-2">
          <button
            onClick={handleMerge}
            disabled={busy === confirm.flagId}
            className="bg-black text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"
          >
            {busy === confirm.flagId ? 'Merging…' : 'Confirm merge'}
          </button>
          <button
            onClick={() => setConfirm(null)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-black"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={handleRescan}
        disabled={rescanning}
        className="mb-6 border border-gray-300 rounded-lg px-4 py-2 text-sm text-black disabled:opacity-50"
      >
        {rescanning ? 'Scanning…' : 'Rescan for new duplicates'}
      </button>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {!pairs && <p className="text-gray-500">Loading…</p>}
      {pairs && pairs.length === 0 && (
        <p className="text-gray-500">No pending duplicates. Nice and clean.</p>
      )}

      <ul className="space-y-4">
        {pairs?.map((pair) => (
          <li key={pair.flag_id} className="border border-gray-200 rounded-lg p-4">
            <div className="text-xs font-medium text-gray-400 uppercase mb-2">
              {pair.event_name} · {REASON_LABEL[pair.reason] || pair.reason}
            </div>
            <div className="flex gap-3 mb-3">
              <RegistrationCard r={pair.registration_a} />
              <RegistrationCard r={pair.registration_b} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openConfirm(pair, 'a')}
                className="bg-black text-white rounded-lg px-3 py-1.5 text-sm"
              >
                Keep &quot;{pair.registration_a.name || 'this one'}&quot;
              </button>
              <button
                onClick={() => openConfirm(pair, 'b')}
                className="bg-black text-white rounded-lg px-3 py-1.5 text-sm"
              >
                Keep &quot;{pair.registration_b.name || 'this one'}&quot;
              </button>
              <button
                onClick={() => handleDismiss(pair.flag_id)}
                disabled={busy === pair.flag_id}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-black disabled:opacity-50"
              >
                Not a duplicate
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
