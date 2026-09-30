'use client'

import { useState } from 'react'

type Member = Record<string, string | number | null>

// Two-step manual merge: pick which of the exactly-2 selected rows to keep,
// then confirm with an editable final name. Mirrors the confirm-step UX of
// /cat/duplicates' DuplicateReviewBoard (same "history moves, the other
// record is deleted, can't be undone" framing) so the two merge entry
// points feel like the same feature, not two different ones -- but this one
// starts from the grid's own multi-select instead of an automated
// duplicate_flags candidate pair.
function MemberCard({ m }: { m: Member }) {
  return (
    <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
      <div className="font-semibold text-slate-900 dark:text-white">{String(m.name ?? '')}</div>
      <div className="text-sm text-slate-600 dark:text-slate-400">{String(m.email ?? '—')}</div>
      <div className="text-sm text-slate-600 dark:text-slate-400">{String(m.phone ?? '—')}</div>
      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        {String(m.campus_preference ?? 'no campus')} · {String(m.connected ?? '—')} · first seen{' '}
        {String(m.first_visit_date ?? 'unknown')}
      </div>
    </div>
  )
}

export default function MergeConfirm({
  pair,
  onCancel,
  onConfirm,
  busy,
  error,
}: {
  pair: [Member, Member]
  onCancel: () => void
  onConfirm: (keepId: number, mergeId: number, finalName: string, addAlias: boolean) => void
  busy: boolean
  error: string | null
}) {
  const [keepIdx, setKeepIdx] = useState<0 | 1 | null>(null)
  const [name, setName] = useState('')
  const [addAlias, setAddAlias] = useState(true)

  if (keepIdx === null) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-lg rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-2">Which record do you want to keep?</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            All attendance, connect cards, follow-ups, deacon notes, prayer requests, next steps, team
            memberships, serving history, leadership roles, and linked kids from the other record move onto
            the one you keep.
          </p>
          <div className="flex gap-3 mb-4">
            <MemberCard m={pair[0]} />
            <MemberCard m={pair[1]} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setKeepIdx(0); setName(String(pair[0].name ?? '')) }}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg px-3 py-1.5 text-sm font-semibold"
            >
              Keep &quot;{String(pair[0].name ?? '')}&quot;
            </button>
            <button
              onClick={() => { setKeepIdx(1); setName(String(pair[1].name ?? '')) }}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg px-3 py-1.5 text-sm font-semibold"
            >
              Keep &quot;{String(pair[1].name ?? '')}&quot;
            </button>
            <button
              onClick={onCancel}
              className="border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  const keep = pair[keepIdx]
  const drop = pair[keepIdx === 0 ? 1 : 0]

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-2">Confirm merge</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Keeping <b>{String(keep.name ?? '')}</b> (id {String(keep.id)}) — all history from{' '}
          <b>{String(drop.name ?? '')}</b> (id {String(drop.id)}) moves onto it, and that record is
          permanently deleted. This can&apos;t be undone.
        </p>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Final name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
        />
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 mb-4">
          <input type="checkbox" checked={addAlias} onChange={(e) => setAddAlias(e.target.checked)} />
          Remember &quot;{String(drop.name ?? '')}&quot; as an alias, so a future connect card under that
          name matches {String(keep.name ?? '')} instead of creating a new duplicate
        </label>
        {error && <p className="text-red-600 dark:text-red-400 text-sm mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(keep.id as number, drop.id as number, name, addAlias)}
            disabled={busy}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? 'Merging…' : 'Confirm merge'}
          </button>
          <button
            onClick={() => setKeepIdx(null)}
            disabled={busy}
            className="border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Back
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            className="border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
