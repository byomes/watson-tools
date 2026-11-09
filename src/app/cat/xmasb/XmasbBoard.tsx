'use client'

import { useCallback, useEffect, useState } from 'react'

type Family = { name: string; language: string; received_at: string | null }
type Data = { families: Family[]; received: number; total: number }

const REFRESH_MS = 15000

// received_at is stored as local (Eastern) "YYYY-MM-DD HH:MM:SS".
function when(stamp: string) {
  const d = new Date(stamp.replace(' ', 'T'))
  if (!Number.isFinite(d.getTime())) return stamp
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function XmasbBoard() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/cat/xmasb', { cache: 'no-store' })
      if (!res.ok) throw new Error('load')
      setData(await res.json())
      setError('')
    } catch {
      setError('Could not refresh. Retrying...')
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(() => document.visibilityState === 'visible' && load(), REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  const received = (data?.families ?? []).filter((f) => f.received_at)
    .sort((a, b) => (b.received_at ?? '').localeCompare(a.received_at ?? ''))
  const waiting = (data?.families ?? []).filter((f) => !f.received_at)

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold">Richardson Park Christmas Blessing 2026</h1>
      <p className="mt-1 text-sm opacity-70">Wish lists received from the families we are blessing.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {!data ? (
        <p className="mt-6">Loading...</p>
      ) : (
        <>
          <p className="mt-4 text-lg font-semibold">{data.received} of {data.total} families are in</p>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-black/10">
            <div className="h-full bg-green-600" style={{ width: `${data.total ? (100 * data.received) / data.total : 0}%` }} />
          </div>

          <h2 className="mt-8 text-lg font-semibold">Received ({received.length})</h2>
          <ul className="mt-2 divide-y divide-black/10 rounded-lg border border-black/10">
            {received.length === 0 && <li className="p-3 text-sm opacity-70">None yet.</li>}
            {received.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 p-3">
                <span className="font-medium">{f.name}</span>
                <span className="text-sm text-green-700">Received {when(f.received_at as string)}</span>
              </li>
            ))}
          </ul>

          <h2 className="mt-8 text-lg font-semibold">Still waiting ({waiting.length})</h2>
          <ul className="mt-2 divide-y divide-black/10 rounded-lg border border-black/10">
            {waiting.length === 0 && <li className="p-3 text-sm opacity-70">Everyone is in.</li>}
            {waiting.map((f) => (
              <li key={f.name} className="flex items-center justify-between gap-3 p-3">
                <span className="font-medium">{f.name}</span>
                <span className="text-sm opacity-70">{f.language === 'Spanish' ? 'Spanish speaking' : 'Still waiting'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
