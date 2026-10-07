'use client'

import { useEffect, useRef, useState } from 'react'

// "Serving team" filter for the members view. Multi-select because a person can serve on several teams: pick one or more teams and a
// member shows if they are on ANY of them. NONE_KEY additionally matches members who are on no team. Same click-outside popover
// pattern as the column picker in CatalystDBBoard.
export const NONE_KEY = '__none__'

export default function TeamFilter({
  teams,
  selected,
  onChange,
  fullWidth = false,
}: {
  teams: string[]
  selected: string[]
  onChange: (next: string[]) => void
  fullWidth?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function toggle(key: string) {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key])
  }

  const label =
    selected.length === 0
      ? 'Serving team: All'
      : selected.length === 1
        ? `Serving team: ${selected[0] === NONE_KEY ? 'Not serving' : selected[0]}`
        : `Serving teams: ${selected.length} selected`

  const row = 'flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'

  return (
    <div ref={ref} className={`relative ${fullWidth ? 'w-full' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${fullWidth ? 'w-full text-left py-2 text-sm' : 'py-1.5 text-xs'} rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-slate-700 dark:text-slate-300 truncate`}
      >
        {label} ▾
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-64 max-h-80 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
          <button
            type="button"
            onClick={() => onChange([])}
            disabled={selected.length === 0}
            className="w-full text-left px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
          >
            Clear (show all)
          </button>
          <label className={`${row} border-t border-slate-100 dark:border-slate-800`}>
            <input type="checkbox" checked={selected.includes(NONE_KEY)} onChange={() => toggle(NONE_KEY)} />
            Not on any team
          </label>
          {teams.map((t) => (
            <label key={t} className={row}>
              <input type="checkbox" checked={selected.includes(t)} onChange={() => toggle(t)} />
              {t}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
