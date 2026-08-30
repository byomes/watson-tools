'use client'

import { useEffect, useState } from 'react'

interface MemberSummary {
  id: number
  name: string
  email: string | null
  phone: string | null
  campus_preference: string | null
  status: string | null
  member_status: string | null
  first_visit_date: string | null
  history_count: number
}

interface Pair {
  flag_id: number
  reason: string
  created_at: string
  member_a: MemberSummary
  member_b: MemberSummary
}

const REASON_LABEL: Record<string, string> = {
  email: 'Same email',
  phone: 'Same phone',
  name_exact: 'Same name',
  name_fuzzy: 'Similar name',
}

interface ConfirmState {
  flagId: number
  keep: MemberSummary
  drop: MemberSummary
  name: string
}

function MemberCard({ m }: { m: MemberSummary }) {
  return (
    <div className="flex-1 border border-gray-200 rounded-lg p-3">
      <div className="font-semibold text-black">{m.name}</div>
      <div className="text-sm text-gray-600">{m.email || '—'}</div>
      <div className="text-sm text-gray-600">{m.phone || '—'}</div>
      <div className="text-xs text-gray-400 mt-1">
        {m.campus_preference || 'no campus'} · {m.status || 'visitor'} · first seen{' '}
        {m.first_visit_date || 'unknown'} · {m.history_count} history record
        {m.history_count === 1 ? '' : 's'}
      </div>
    </div>
  )
}

export default function DuplicateReviewBoard() {
  const [pairs, setPairs] = useState<Pair[] | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rescanning, setRescanning] = useState(false)

  const load = async () => {
    setError(null)
    const res = await fetch('/api/cat/duplicates/list')
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
    const res = await fetch('/api/cat/duplicates/rescan', { method: 'POST' })
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
    const res = await fetch('/api/cat/duplicates/dismiss', {
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
    const keep = keepSide === 'a' ? pair.member_a : pair.member_b
    const drop = keepSide === 'a' ? pair.member_b : pair.member_a
    setConfirm({ flagId: pair.flag_id, keep, drop, name: keep.name })
  }

  const handleMerge = async () => {
    if (!confirm) return
    setBusy(confirm.flagId)
    setError(null)
    const res = await fetch('/api/cat/duplicates/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flag_id: confirm.flagId,
        keep_id: confirm.keep.id,
        merge_id: confirm.drop.id,
        name: confirm.name,
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
          Keeping <b>{confirm.keep.name}</b> (id {confirm.keep.id}) — all history from{' '}
          <b>{confirm.drop.name}</b> (id {confirm.drop.id}) will move onto it, and that record
          will be deleted. This can&apos;t be undone.
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Final name</label>
        <input
          type="text"
          value={confirm.name}
          onChange={(e) => setConfirm({ ...confirm, name: e.target.value })}
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
              {REASON_LABEL[pair.reason] || pair.reason}
            </div>
            <div className="flex gap-3 mb-3">
              <MemberCard m={pair.member_a} />
              <MemberCard m={pair.member_b} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openConfirm(pair, 'a')}
                className="bg-black text-white rounded-lg px-3 py-1.5 text-sm"
              >
                Keep &quot;{pair.member_a.name}&quot;
              </button>
              <button
                onClick={() => openConfirm(pair, 'b')}
                className="bg-black text-white rounded-lg px-3 py-1.5 text-sm"
              >
                Keep &quot;{pair.member_b.name}&quot;
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
