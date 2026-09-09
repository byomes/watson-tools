'use client'

import { useEffect, useState } from 'react'

interface TownOption {
  town: string
  drive_hours: number
  count: number
}

interface Deal {
  id: number
  source: 'travelzoo'
  name: string
  city: string | null
  state: string | null
  town: string | null
  drive_hours: number | null
  price_per_night: number | null
  discount_text: string | null
  source_url: string
  primary_image_url: string | null
  review_status: 'new' | 'saved' | 'dismissed'
}

interface DealDetail extends Deal {
  description: string | null
}

function formatDriveHours(hours: number | null): string | null {
  if (hours == null) return null
  const rounded = Math.round(hours * 2) / 2
  return `~${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} hr${rounded === 1 ? '' : 's'} away`
}

export default function FlashDeals() {
  const [towns, setTowns] = useState<TownOption[]>([])
  const [selectedTowns, setSelectedTowns] = useState<string[]>([])
  const [reviewStatus, setReviewStatus] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [minDiscount, setMinDiscount] = useState('')
  const [q, setQ] = useState('')

  const [results, setResults] = useState<Deal[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<DealDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetch('/api/p/beachhouse/deals/towns')
      .then((r) => r.json())
      .then((data: TownOption[]) => {
        setTowns(Array.isArray(data) ? data : [])
        setSelectedTowns(Array.isArray(data) ? data.map((t) => t.town) : [])
      })
      .catch(() => setTowns([]))
  }, [])

  useEffect(() => {
    if (towns.length > 0) runSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [towns.length])

  function toggleTown(t: string) {
    setSelectedTowns((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault()
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (selectedTowns.length > 0 && selectedTowns.length < towns.length) {
      params.set('towns', selectedTowns.join(','))
    }
    if (reviewStatus) params.set('review_status', reviewStatus)
    if (maxPrice) params.set('max_price', maxPrice)
    if (minDiscount) params.set('min_discount', minDiscount)
    if (q) params.set('q', q)

    try {
      const res = await fetch(`/api/p/beachhouse/deals/search?${params.toString()}`)
      if (!res.ok) throw new Error('search failed')
      setResults(await res.json())
    } catch {
      setError('Search failed — try again in a moment.')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  async function openDeal(id: number) {
    setDetailLoading(true)
    setSelected(null)
    try {
      const res = await fetch(`/api/p/beachhouse/deals/${id}`)
      if (!res.ok) throw new Error('failed')
      setSelected(await res.json())
    } catch {
      setSelected(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function setStatusFor(id: number, status: 'saved' | 'dismissed') {
    try {
      await fetch(`/api/p/beachhouse/deals/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_status: status }),
      })
      setResults((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, review_status: status } : r)) : prev))
      setSelected((prev) => (prev && prev.id === id ? { ...prev, review_status: status } : prev))
    } catch {
      // best-effort
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Same-week Travelzoo hotel deals close to home — for a spur-of-the-moment single night.
        True app-only flash sales (HotelTonight, hotel loyalty programs) aren&apos;t public web
        pages, so they can&apos;t be searched here — worth checking those apps directly for the
        very deepest last-minute drops.
      </p>

      <form onSubmit={runSearch} className="mb-8 border-b pb-6">
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-2">Area</label>
          <div className="flex flex-wrap gap-2">
            {towns.map((t) => (
              <label key={t.town} className="flex items-center gap-1.5 text-sm border rounded-md px-3 py-1.5 cursor-pointer">
                <input type="checkbox" checked={selectedTowns.includes(t.town)} onChange={() => toggleTown(t.town)} />
                {t.town} <span className="text-gray-400">(~{t.drive_hours}h, {t.count})</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
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
            <label className="block text-sm text-gray-600 mb-1">Max price/night</label>
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="any"
              className="border rounded-md px-3 py-2 text-sm w-28"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Min discount %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={minDiscount}
              onChange={(e) => setMinDiscount(e.target.value)}
              placeholder="any"
              className="border rounded-md px-3 py-2 text-sm w-28"
            />
          </div>
          <div className="flex-1 min-w-[10rem]">
            <label className="block text-sm text-gray-600 mb-1">Keyword</label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="hotel name, city..."
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
        </div>
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
            <button onClick={() => openDeal(r.id)} className="block w-full text-left">
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
                    Travelzoo
                  </span>
                  {r.discount_text && (
                    <span className="text-[10px] font-semibold text-emerald-600">{r.discount_text} off</span>
                  )}
                  {r.review_status === 'saved' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 ml-auto">
                      Saved
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-sm">{r.name}</h3>
                <p className="text-xs text-gray-500">
                  {r.city ? `${r.city}, ` : ''}
                  {r.state || r.town}
                  {formatDriveHours(r.drive_hours) && ` · ${formatDriveHours(r.drive_hours)}`}
                </p>
                <p className="text-sm mt-1 font-semibold">
                  {r.price_per_night != null ? `$${r.price_per_night.toLocaleString()}/night` : 'Price varies'}
                </p>
              </div>
            </button>
            <div className="flex border-t text-xs">
              <button
                onClick={() => setStatusFor(r.id, 'saved')}
                className="flex-1 py-2 hover:bg-emerald-50 text-emerald-700 font-medium"
              >
                ✓ Save
              </button>
              <button
                onClick={() => setStatusFor(r.id, 'dismissed')}
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
                  {selected.state || selected.town}
                  {formatDriveHours(selected.drive_hours) && ` (${formatDriveHours(selected.drive_hours)})`}
                  {' · '}
                  {selected.price_per_night != null ? `$${selected.price_per_night.toLocaleString()}/night` : 'Price varies'}
                  {selected.discount_text && ` · ${selected.discount_text} off`}
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
                    onClick={() => setStatusFor(selected.id, 'saved')}
                    className="bg-emerald-600 text-white rounded-md px-4 py-2 text-sm font-medium"
                  >
                    ✓ Save
                  </button>
                  <button
                    onClick={() => setStatusFor(selected.id, 'dismissed')}
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
                    View on Travelzoo →
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
