'use client'

import { useEffect, useState } from 'react'

interface Listing {
  id: number
  source: 'vrbo' | 'airbnb'
  name: string
  city: string | null
  state: string | null
  bedrooms: number | null
  bathrooms: number | null
  max_sleeps: number | null
  source_url: string
  primary_image_url: string | null
  review_status: 'new' | 'saved' | 'dismissed'
}

interface ListingDetail extends Listing {
  description: string | null
}

interface StateOption {
  state: string
  count: number
}

const SOURCE_LABEL: Record<Listing['source'], string> = { vrbo: 'Vrbo', airbnb: 'Airbnb' }

export default function BeachHouseSearch() {
  const [states, setStates] = useState<StateOption[]>([])
  const [state, setState] = useState('')
  const [source, setSource] = useState('')
  const [reviewStatus, setReviewStatus] = useState('')
  const [minBedrooms, setMinBedrooms] = useState('')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Listing[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ListingDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetch('/api/p/beachhouse/states')
      .then((r) => r.json())
      .then((data) => setStates(Array.isArray(data) ? data : []))
      .catch(() => setStates([]))
  }, [])

  useEffect(() => {
    runSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault()
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (state) params.set('state', state)
    if (source) params.set('source', source)
    if (reviewStatus) params.set('review_status', reviewStatus)
    if (minBedrooms) params.set('min_bedrooms', minBedrooms)
    if (q) params.set('q', q)

    try {
      const res = await fetch(`/api/p/beachhouse/search?${params.toString()}`)
      if (!res.ok) throw new Error('search failed')
      setResults(await res.json())
    } catch {
      setError('Search failed — try again in a moment.')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  async function openListing(id: number) {
    setDetailLoading(true)
    setSelected(null)
    try {
      const res = await fetch(`/api/p/beachhouse/listing/${id}`)
      if (!res.ok) throw new Error('failed')
      setSelected(await res.json())
    } catch {
      setSelected(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function setReviewStatusFor(id: number, status: 'saved' | 'dismissed') {
    try {
      await fetch(`/api/p/beachhouse/listing/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_status: status }),
      })
      setResults((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, review_status: status } : r)) : prev))
      setSelected((prev) => (prev && prev.id === id ? { ...prev, review_status: status } : prev))
    } catch {
      // best-effort — a failed status update just leaves the card as-is
    }
  }

  return (
    <div>
      <form onSubmit={runSearch} className="flex flex-wrap gap-3 items-end mb-8 border-b pb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-1">State</label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm min-w-[10rem]"
          >
            <option value="">Any</option>
            {states.map((s) => (
              <option key={s.state} value={s.state}>
                {s.state} ({s.count})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Site</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm min-w-[8rem]"
          >
            <option value="">Any</option>
            <option value="vrbo">Vrbo</option>
            <option value="airbnb">Airbnb</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Status</label>
          <select
            value={reviewStatus}
            onChange={(e) => setReviewStatus(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm min-w-[8rem]"
          >
            <option value="">New + Saved</option>
            <option value="new">New only</option>
            <option value="saved">Saved only</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Min bedrooms</label>
          <input
            type="number"
            min={0}
            value={minBedrooms}
            onChange={(e) => setMinBedrooms(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm w-28"
          />
        </div>
        <div className="flex-1 min-w-[12rem]">
          <label className="block text-sm text-gray-600 mb-1">Keyword</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="name, city, description..."
            className="border rounded-md px-3 py-2 text-sm w-full"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white rounded-md px-5 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {results !== null && (
        <p className="text-sm text-gray-500 mb-4">{results.length} result{results.length === 1 ? '' : 's'}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {results?.map((r) => (
          <div
            key={r.id}
            className={`text-left border rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
              r.review_status === 'saved' ? 'ring-2 ring-emerald-400' : ''
            } ${r.review_status === 'dismissed' ? 'opacity-50' : ''}`}
          >
            <button onClick={() => openListing(r.id)} className="block w-full text-left">
              <div className="aspect-video bg-gray-100">
                {r.primary_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.primary_image_url} alt={r.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    No photo
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 border rounded px-1.5 py-0.5">
                    {SOURCE_LABEL[r.source]}
                  </span>
                  {r.review_status === 'saved' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Saved</span>
                  )}
                </div>
                <h3 className="font-medium text-sm">{r.name}</h3>
                <p className="text-xs text-gray-500">
                  {r.city ? `${r.city}, ` : ''}
                  {r.state}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {r.bedrooms ?? '?'} bd · {r.bathrooms ?? '?'} ba
                  {r.max_sleeps ? ` · sleeps ${r.max_sleeps}` : ''}
                </p>
              </div>
            </button>
            <div className="flex border-t text-xs">
              <button
                onClick={() => setReviewStatusFor(r.id, 'saved')}
                className="flex-1 py-2 hover:bg-emerald-50 text-emerald-700 font-medium"
              >
                ✓ Save
              </button>
              <button
                onClick={() => setReviewStatusFor(r.id, 'dismissed')}
                className="flex-1 py-2 border-l hover:bg-gray-50 text-gray-500 font-medium"
              >
                ✕ Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>

      {(detailLoading || selected) && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading && <p className="text-sm text-gray-500">Loading...</p>}
            {selected && (
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-black">
                    ✕
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  {selected.city ? `${selected.city}, ` : ''}
                  {selected.state} · {selected.bedrooms ?? '?'} bd · {selected.bathrooms ?? '?'} ba
                  {selected.max_sleeps ? ` · sleeps ${selected.max_sleeps}` : ''}
                </p>

                {selected.primary_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.primary_image_url}
                    alt={selected.name}
                    className="w-full rounded-md object-cover mb-4 max-h-72"
                  />
                )}

                {selected.description && (
                  <p className="text-sm text-gray-700 whitespace-pre-line mb-4">{selected.description}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setReviewStatusFor(selected.id, 'saved')}
                    className="bg-emerald-600 text-white rounded-md px-4 py-2 text-sm font-medium"
                  >
                    ✓ Save
                  </button>
                  <button
                    onClick={() => setReviewStatusFor(selected.id, 'dismissed')}
                    className="border rounded-md px-4 py-2 text-sm font-medium text-gray-600"
                  >
                    ✕ Dismiss
                  </button>
                  <a
                    href={selected.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center text-sm font-medium underline"
                  >
                    View on {SOURCE_LABEL[selected.source]} →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
