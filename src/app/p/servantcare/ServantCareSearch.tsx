'use client'

import { useEffect, useState } from 'react'

const PHOTO_BASE = 'https://watson.tail0243ff.ts.net'

interface Listing {
  pid: number
  name: string
  city: string | null
  state: string | null
  bedrooms: number | null
  bathrooms: number | null
  max_sleeps: number | null
  price_summary: string | null
  source_url: string
  primary_image_url: string | null
}

interface ListingDetail extends Omit<Listing, 'primary_image_url'> {
  description: string | null
  allergy_alert: string | null
  amenities: string[]
  pricing: { label: string | null; detail: string | null; amount: string | null }[]
  image_urls: string[]
  max_stay_nights: number | null
}

interface StateOption {
  state: string
  count: number
}

export default function ServantCareSearch() {
  const [states, setStates] = useState<StateOption[]>([])
  const [state, setState] = useState('')
  const [minBedrooms, setMinBedrooms] = useState('')
  const [minSleeps, setMinSleeps] = useState('')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Listing[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ListingDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetch('/api/p/servantcare/states')
      .then((r) => r.json())
      .then((data) => setStates(Array.isArray(data) ? data : []))
      .catch(() => setStates([]))
  }, [])

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault()
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (state) params.set('state', state)
    if (minBedrooms) params.set('min_bedrooms', minBedrooms)
    if (minSleeps) params.set('min_sleeps', minSleeps)
    if (q) params.set('q', q)

    try {
      const res = await fetch(`/api/p/servantcare/search?${params.toString()}`)
      if (!res.ok) throw new Error('search failed')
      setResults(await res.json())
    } catch {
      setError('Search failed — try again in a moment.')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  async function openListing(pid: number) {
    setDetailLoading(true)
    setSelected(null)
    try {
      const res = await fetch(`/api/p/servantcare/listing/${pid}`)
      if (!res.ok) throw new Error('failed')
      setSelected(await res.json())
    } catch {
      setSelected(null)
    } finally {
      setDetailLoading(false)
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
          <label className="block text-sm text-gray-600 mb-1">Min bedrooms</label>
          <input
            type="number"
            min={0}
            value={minBedrooms}
            onChange={(e) => setMinBedrooms(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm w-28"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Min sleeps</label>
          <input
            type="number"
            min={0}
            value={minSleeps}
            onChange={(e) => setMinSleeps(e.target.value)}
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

      {results === null && !loading && (
        <p className="text-gray-500 text-sm">Set your filters and press Search.</p>
      )}

      {results !== null && (
        <p className="text-sm text-gray-500 mb-4">{results.length} result{results.length === 1 ? '' : 's'}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {results?.map((r) => (
          <button
            key={r.pid}
            onClick={() => openListing(r.pid)}
            className="text-left border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="aspect-video bg-gray-100">
              {r.primary_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${PHOTO_BASE}${r.primary_image_url}`}
                  alt={r.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  No photo
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm">{r.name}</h3>
              <p className="text-xs text-gray-500">
                {r.city}, {r.state}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {r.bedrooms ?? '?'} bd · {r.bathrooms ?? '?'} ba · sleeps {r.max_sleeps ?? '?'}
                {r.price_summary ? ` · ${r.price_summary}/night` : ''}
              </p>
            </div>
          </button>
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
                  {selected.city}, {selected.state} · {selected.bedrooms ?? '?'} bd ·{' '}
                  {selected.bathrooms ?? '?'} ba · sleeps {selected.max_sleeps ?? '?'}
                  {selected.max_stay_nights ? ` · max stay ${selected.max_stay_nights} nights` : ''}
                </p>

                {selected.image_urls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mb-4">
                    {selected.image_urls.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={`${PHOTO_BASE}${url}`}
                        alt={selected.name}
                        className="h-40 w-auto rounded-md object-cover shrink-0"
                      />
                    ))}
                  </div>
                )}

                {selected.description && (
                  <p className="text-sm text-gray-700 whitespace-pre-line mb-4">{selected.description}</p>
                )}

                {selected.pricing.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-1">Pricing</h3>
                    <ul className="text-sm text-gray-700">
                      {selected.pricing.map((p, i) => (
                        <li key={i}>
                          {p.label}
                          {p.detail ? ` (${p.detail})` : ''}: {p.amount}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selected.amenities.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-1">Amenities</h3>
                    <p className="text-sm text-gray-700">{selected.amenities.join(' · ')}</p>
                  </div>
                )}

                {selected.allergy_alert && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-1">Allergy Alert</h3>
                    <p className="text-sm text-gray-700">{selected.allergy_alert}</p>
                  </div>
                )}

                <a
                  href={selected.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-sm font-medium underline"
                >
                  View / request booking on servantcare.com →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
