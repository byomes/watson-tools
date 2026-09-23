'use client'

import { useState } from 'react'
import { COLUMNS } from './columns'

type Member = Record<string, string | number | null>

export default function MemberDetail({
  member,
  onClose,
  onSave,
  onDeactivate,
}: {
  member: Member
  onClose: () => void
  onSave: (changes: Record<string, string | number>) => Promise<void>
  onDeactivate: () => void
}) {
  const [draft, setDraft] = useState<Member>(member)
  const [saving, setSaving] = useState(false)

  function set(key: string, value: string | number) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  const dirty = COLUMNS.some((c) => String(draft[c.key] ?? '') !== String(member[c.key] ?? ''))

  async function handleSave() {
    const changes: Record<string, string | number> = {}
    for (const c of COLUMNS) {
      if (c.readOnly) continue
      const before = String(member[c.key] ?? '')
      const after = String(draft[c.key] ?? '')
      if (before !== after) changes[c.key] = draft[c.key] as string | number
    }
    if (Object.keys(changes).length === 0) return onClose()
    setSaving(true)
    try {
      await onSave(changes)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 flex items-center gap-3">
        <button onClick={onClose} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
          ← Back to list
        </button>
        <h1 className="text-base font-semibold text-slate-900 dark:text-white flex-1 truncate">{String(member.name ?? '')}</h1>
        <button
          onClick={onDeactivate}
          className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-semibold hover:opacity-90"
        >
          Deactivate
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-40"
        >
          {saving ? 'Saving…' : dirty ? 'Save' : 'Done'}
        </button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-6">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COLUMNS.map((c) => {
            const value = draft[c.key]
            if (c.readOnly) {
              return (
                <div key={c.key} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.label}</span>
                  <span className="text-sm text-slate-400 dark:text-slate-500 py-1.5">{value ?? '—'}</span>
                </div>
              )
            }
            return (
              <div key={c.key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.label}</label>
                {c.type === 'bool' ? (
                  <button
                    type="button"
                    onClick={() => set(c.key, value ? 0 : 1)}
                    className={`self-start inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      value ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                        value ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                ) : c.type === 'select' ? (
                  <select
                    value={String(value ?? '')}
                    onChange={(e) => set(c.key, e.target.value)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">—</option>
                    {c.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={c.type === 'date' ? 'date' : 'text'}
                    value={String(value ?? '')}
                    onChange={(e) => set(c.key, e.target.value)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
