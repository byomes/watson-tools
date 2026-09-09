'use client'

import { useEffect, useMemo, useState } from 'react'

type CategorySlug = 'beach' | 'mountain' | 'romance'

interface AmenityDef {
  key: string
  label: string
}

interface CategoryConfig {
  label: string
  states: string[]
  amenities: AmenityDef[]
  default_min_bedrooms: number | null
  default_max_bedrooms: number | null
  default_min_bathrooms: number | null
}

type Categories = Record<CategorySlug, CategoryConfig>

interface Listing {
  id: number
  category: CategorySlug
  source: 'vrbo' | 'airbnb'
  name: string
  city: string | null
  state: string | null
  drive_hours: number | null
  bedrooms: number | null
  bathrooms: number | null
  max_sleeps: number | null
  source_url: string
  primary_image_url: string | null
  price_low: number | null
  price_high: number | null
  price_note: string | null
  review_status: 'new' | 'saved' | 'dismissed'
  [amenityKey: string]: unknown
}

interface ListingDetail extends Listing {
  description: string | null
}

interface StateOption {
  state: string
  count: number
}

const SOURCE_LABEL: Record<Listing['source'], string> = { vrbo: 'Vrbo', airbnb: 'Airbnb' }
const CATEGORY_ORDER: CategorySlug[] = ['beach', 'mountain', 'romance']

export default function GetawaySearch() {
  const [categories, setCategories] = useState<Categories | null>(null)
  const [category, setCategory] = useState<CategorySlug>('beach')

  const [stateCounts, setStateCounts] = useState<StateOption[]>([])
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [source, setSource] = useState('')
  const [reviewStatus, setReviewStatus] = useState('')
  const [minBedrooms, setMinBedrooms] = useState('')
  const [maxBedrooms, setMaxBedrooms] = useState('')
  const [minBathrooms, setMinBathrooms] = useState('')
  const [requiredAmenities, setRequiredAmenities] = useState<Set<string>>(new Set())
  const [maxPrice, setMaxPrice] = useState('')
  const [includeUnpriced, setIncludeUnpriced] = useState(true)
  const [q, setQ] = useState('')

  const [results, setResults] = useState<Listing[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ListingDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [priceLowDraft, setPriceLowDraft] = useState('')
  const [priceHighDraft, setPriceHighDraft] = useState('')
  const [priceNoteDraft, setPriceNoteDraft] = useState('')

  const cfg = categories?.[category]

  // Load category config once.
  useEffect(() => {
    fetch('/api/p/beachhouse/categories')
      .then((r) => r.json())
      .then((data: Categories) => {
        setCategories(data)
        const first = data[category]
        if (first) applyCategoryDefaults(first)
      })
      .catch(() => setCategories(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyCategoryDefaults(c: CategoryConfig) {
    setSelectedStates(c.states)
    setMinBedrooms(c.default_min_bedrooms != null ? String(c.default_min_bedrooms) : '')
    setMaxBedrooms(c.default_max_bedrooms != null ? String(c.default_max_bedrooms) : '')
    setMinBathrooms(c.default_min_bathrooms != null ? String(c.default_min_bathrooms) : '')
    setRequiredAmenities(new Set(c.amenities.map((a) => a.key)))
  }

  function switchCategory(next: CategorySlug) {
    setCategory(next)
    setResults(null)
    setSelected(null)
    const nextCfg = categories?.[next]
    if (nextCfg) applyCategoryDefaults(nextCfg)
  }

  // Reload state counts and re-run search whenever the active category changes.
  useEffect(() => {
    if (!cfg) return
    fetch(`/api/p/beachhouse/states?category=${category}`)
      .then((r) => r.json())
      .then((data) => setStateCounts(Array.isArray(data) ? data : []))
      .catch(() => setStateCounts([]))
    runSearch(undefined, category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, cfg])

  function toggleState(s: string) {
    setSelectedStates((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  function toggleAmenity(key: string) {
    setRequiredAmenities((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function runSearch(e?: React.FormEvent, categoryOverride?: CategorySlug) {
    e?.preventDefault()
    const activeCategory = categoryOverride ?? category
    const activeCfg = categories?.[activeCategory]
    if (!activeCfg) return
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    params.set('category', activeCategory)
    const states = categoryOverride ? activeCfg.states : selectedStates
    if (states.length > 0 && states.length < activeCfg.states.length) {
      params.set('states', states.join(','))
    }
    if (source) params.set('source', source)
    if (reviewStatus) params.set('review_status', reviewStatus)
    const minBd = categoryOverride ? activeCfg.default_min_bedrooms : minBedrooms
    const maxBd = categoryOverride ? activeCfg.default_max_bedrooms : maxBedrooms
    const minBa = categoryOverride ? activeCfg.default_min_bathrooms : minBathrooms
    if (minBd) params.set('min_bedrooms', String(minBd))
    if (maxBd) params.set('max_bedrooms', String(maxBd))
    if (minBa) params.set('min_bathrooms', String(minBa))
    const amenities = categoryOverride ? new Set(activeCfg.amenities.map((a) => a.key)) : requiredAmenities
    for (const key of amenities) params.set(`amenity_${key}`, '1')
    if (!categoryOverride && maxPrice) {
      params.set('max_price', maxPrice)
      params.set('include_unpriced', includeUnpriced ? '1' : '0')
    }
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
      const data = await res.json()
      setSelected(data)
      setPriceLowDraft(data.price_low != null ? String(data.price_low) : '')
      setPriceHighDraft(data.price_high != null ? String(data.price_high) : '')
      setPriceNoteDraft(data.price_note ?? '')
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

  async function savePrice(id: number) {
    try {
      const res = await fetch(`/api/p/beachhouse/listing/${id}/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_low: priceLowDraft === '' ? null : Number(priceLowDraft),
          price_high: priceHighDraft === '' ? null : Number(priceHighDraft),
          price_note: priceNoteDraft,
        }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      const patch = { price_low: data.price_low, price_high: data.price_high, price_note: data.price_note }
      setResults((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev))
      setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev))
    } catch {
      // best-effort
    }
  }

  function formatPrice(r: Pick<Listing, 'price_low' | 'price_high'>): string | null {
    if (r.price_low == null && r.price_high == null) return null
    const fmt = (n: number) => `$${n.toLocaleString()}`
    if (r.price_low != null && r.price_high != null && r.price_low !== r.price_high) {
      return `${fmt(r.price_low)}–${fmt(r.price_high)}/wk`
    }
    return `${fmt((r.price_low ?? r.price_high) as number)}/wk`
  }

  function formatDriveHours(hours: number | null): string | null {
    if (hours == null) return null
    // stored/estimated on a 0.5hr scale already; round defensively so a
    // stray value never prints an odd decimal like "3.7 hrs"
    const rounded = Math.round(hours * 2) / 2
    return `~${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} hr${rounded === 1 ? '' : 's'} away`
  }

  const amenityBadges = useMemo(() => cfg?.amenities ?? [], [cfg])

  if (!categories || !cfg) {
    return <p className="text-sm text-gray-500">Loading…</p>
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {CATEGORY_ORDER.map((slug) => (
          <button
            key={slug}
            onClick={() => switchCategory(slug)}
            className={`px-4 py-2 text-sm font-medium rounded-md border ${
              category === slug ? 'bg-black text-white border-black' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {categories[slug].label}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => runSearch(e)} className="mb-8 border-b pb-6">
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-2">States</label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {cfg.states.map((s) => {
              const count = stateCounts.find((c) => c.state === s)?.count ?? 0
              return (
                <label key={s} className="flex items-center gap-1.5 text-sm border rounded-md px-3 py-1.5 cursor-pointer">
                  <input type="checkbox" checked={selectedStates.includes(s)} onChange={() => toggleState(s)} />
                  {s} <span className="text-gray-400">({count})</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
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
              className="border rounded-md px-3 py-2 text-sm w-24"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Max bedrooms</label>
            <input
              type="number"
              min={0}
              value={maxBedrooms}
              onChange={(e) => setMaxBedrooms(e.target.value)}
              placeholder="none"
              className="border rounded-md px-3 py-2 text-sm w-24"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Min bathrooms</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={minBathrooms}
              onChange={(e) => setMinBathrooms(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm w-24"
            />
          </div>
          {amenityBadges.map((a) => (
            <label key={a.key} className="flex items-center gap-1.5 text-sm pb-2">
              <input
                type="checkbox"
                checked={requiredAmenities.has(a.key)}
                onChange={() => toggleAmenity(a.key)}
              />
              {a.label}
            </label>
          ))}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Max price ($/wk)</label>
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="any"
              className="border rounded-md px-3 py-2 text-sm w-28"
            />
          </div>
          {maxPrice && (
            <label className="flex items-center gap-1.5 text-sm pb-2">
              <input type="checkbox" checked={includeUnpriced} onChange={(e) => setIncludeUnpriced(e.target.checked)} />
              Include not-yet-priced
            </label>
          )}
          <div className="flex-1 min-w-[10rem]">
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
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 border rounded px-1.5 py-0.5">
                    {SOURCE_LABEL[r.source]}
                  </span>
                  {amenityBadges
                    .filter((a) => r[a.key])
                    .map((a) => (
                      <span key={a.key} className="text-[10px] text-gray-500">
                        {a.label}
                      </span>
                    ))}
                  {r.review_status === 'saved' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 ml-auto">
                      Saved
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-sm">{r.name}</h3>
                <p className="text-xs text-gray-500">
                  {r.city ? `${r.city}, ` : ''}
                  {r.state}
                  {formatDriveHours(r.drive_hours) && ` · ${formatDriveHours(r.drive_hours)}`}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {r.bedrooms ?? '?'} bd · {r.bathrooms ?? '?'} ba
                  {r.max_sleeps ? ` · sleeps ${r.max_sleeps}` : ''}
                </p>
                <p className="text-xs mt-1 font-medium">
                  {formatPrice(r) ? (
                    formatPrice(r)
                  ) : (
                    <span className="text-gray-400 font-normal">Price: not checked yet</span>
                  )}
                </p>
                {r.price_note && <p className="text-[11px] text-gray-500 mt-0.5">{r.price_note}</p>}
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
                  {selected.state}
                  {formatDriveHours(selected.drive_hours) && ` (${formatDriveHours(selected.drive_hours)})`}
                  {' · '}
                  {selected.bedrooms ?? '?'} bd · {selected.bathrooms ?? '?'} ba
                  {selected.max_sleeps ? ` · sleeps ${selected.max_sleeps}` : ''}
                  {amenityBadges
                    .filter((a) => selected[a.key])
                    .map((a) => ` · ${a.label.toLowerCase()}`)
                    .join('')}
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

                <div className="mb-4 border rounded-md p-3 bg-gray-50">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Price, per week (whatever you find on the real listing — low is what feeds the
                    Max price filter)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="number"
                      min={0}
                      value={priceLowDraft}
                      onChange={(e) => setPriceLowDraft(e.target.value)}
                      placeholder="low, e.g. 5400"
                      className="border rounded-md px-3 py-2 text-sm w-32"
                    />
                    <input
                      type="number"
                      min={0}
                      value={priceHighDraft}
                      onChange={(e) => setPriceHighDraft(e.target.value)}
                      placeholder="high (peak), e.g. 9200"
                      className="border rounded-md px-3 py-2 text-sm w-36"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={priceNoteDraft}
                      onChange={(e) => setPriceNoteDraft(e.target.value)}
                      placeholder='notes, e.g. "checked May 10-17 and July 10-17"'
                      className="border rounded-md px-3 py-2 text-sm flex-1"
                    />
                    <button
                      onClick={() => savePrice(selected.id)}
                      className="border rounded-md px-3 py-2 text-sm font-medium"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Neither VRBO nor Airbnb allow automated price lookups by date, so this is
                    manual — check the listing, then jot down what you saw.
                  </p>
                </div>

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
