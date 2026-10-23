'use client'
import { useEffect, useState } from 'react'

type Item = {
  id: number; first: string; last: string; address: string; age: string
  gender: string; similar: string[]; decision: string
}

export default function Board() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  async function load() {
    const r = await fetch('/api/cat/scratch/addrreview/list')
    const d = await r.json().catch(() => ({}))
    setItems(d.items ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function decide(it: Item, decision: string) {
    const next = it.decision === decision ? '' : decision
    setItems(xs => xs.map(x => (x.id === it.id ? { ...x, decision: next } : x)))
    await fetch('/api/cat/scratch/addrreview/decide', {
      method: 'POST',
      body: JSON.stringify({ id: it.id, decision: next }),
    })
  }

  async function apply() {
    const n = items.filter(i => i.decision === 'add').length
    if (!n || !confirm(`Create ${n} new member${n > 1 ? 's' : ''} with these addresses?`)) return
    const r = await fetch('/api/cat/scratch/addrreview/apply', { method: 'POST', body: '{}' })
    const d = await r.json().catch(() => ({}))
    setMsg(`Added ${(d.added ?? []).length}`)
    load()
  }

  const count = (d: string) => items.filter(i => i.decision === d).length
  const btn = (on: boolean, color: string) =>
    `px-3 py-1.5 rounded-full text-sm border ${on ? color + ' text-white border-transparent' : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-black dark:text-white pb-24">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        <h1 className="text-xl font-bold">Address review</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          People in the Contacts CSV with an address but no matching member. Mark each Add or Ignore, then Apply.
        </p>
        {loading && <p className="text-sm">Loading...</p>}
        <ul className="space-y-3">
          {items.map(it => (
            <li key={it.id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">
                    {it.first} {it.last}
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {[it.age && `age ${it.age}`, it.gender].filter(Boolean).join(', ')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 break-words">{it.address}</div>
                  {it.similar.length > 0 && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Similar in DB: {it.similar.join(', ')}
                    </div>
                  )}
                </div>
                {it.decision === 'added' ? (
                  <span className="text-sm text-green-600 shrink-0">Added</span>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => decide(it, 'add')} className={btn(it.decision === 'add', 'bg-green-600')}>Add</button>
                    <button onClick={() => decide(it, 'ignore')} className={btn(it.decision === 'ignore', 'bg-gray-500')}>Ignore</button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="fixed bottom-0 inset-x-0 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {count('add')} add, {count('ignore')} ignore, {items.filter(i => !i.decision).length} undecided {msg && `· ${msg}`}
          </span>
          <button onClick={apply} disabled={!count('add')} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm disabled:opacity-40">
            Apply adds
          </button>
        </div>
      </div>
    </div>
  )
}
