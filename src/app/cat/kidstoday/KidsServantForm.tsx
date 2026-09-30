'use client'

import { useState, useEffect } from 'react'

interface Servant {
  name: string
  member_id: number
  person_id: number
}

const DEFAULT_SERVANTS: Record<string, Servant> = {
  Nursery: { name: 'Tara Mathena', member_id: 236, person_id: 450 },
  'Pre-K': { name: 'Tara Mathena', member_id: 236, person_id: 450 },
  Elementary: { name: 'Lucie Hale', member_id: 102, person_id: 332 },
}

const CLASSES = ['Nursery', 'Pre-K', 'Elementary']

export default function KidsServantForm() {
  const [servants, setServants] = useState<Record<string, Servant>>(DEFAULT_SERVANTS)
  const [searchOpen, setSearchOpen] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Servant[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        const res = await fetch('/api/cat/kidstoday')
        if (res.ok) {
          const data = await res.json()
          setServants(data.servants)
        }
      } catch (e) {
        console.error('Failed to fetch current overrides:', e)
      }
    }
    fetchDefaults()
  }, [])

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)

    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/cat/kidstoday/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.results || [])
      }
    } catch (e) {
      console.error('Search failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const selectServant = (className: string, servant: Servant) => {
    setServants(prev => ({ ...prev, [className]: servant }))
    setSearchOpen(null)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleSubmit = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/cat/kidstoday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servants }),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Servants updated successfully' })
      } else {
        const error = await res.text()
        setMessage({ type: 'error', text: error || 'Failed to save' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = JSON.stringify(servants) !== JSON.stringify(DEFAULT_SERVANTS)

  return (
    <div className="space-y-6">
      {CLASSES.map(className => (
        <div key={className} className="border rounded-lg p-4 bg-gray-50">
          <label className="block text-sm font-semibold text-gray-700 mb-2">{className}</label>
          <div className="mb-3">
            <div className="text-base text-gray-900 font-medium">{servants[className].name}</div>
            <div className="text-xs text-gray-500">ID: {servants[className].member_id}</div>
          </div>

          <button
            onClick={() => {
              setSearchOpen(searchOpen === className ? null : className)
              setSearchQuery('')
              setSearchResults([])
            }}
            className="w-full px-3 py-2 text-sm border border-blue-300 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
          >
            Change
          </button>

          {searchOpen === className && (
            <div className="mt-3 pt-3 border-t">
              <input
                type="text"
                placeholder="Search servants..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
                autoFocus
              />

              {loading && <div className="text-sm text-gray-500">Searching...</div>}

              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {searchResults.map(result => (
                    <button
                      key={result.member_id}
                      onClick={() => selectServant(className, result)}
                      className="w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-100"
                    >
                      {result.name}
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !loading && (
                <div className="text-sm text-gray-500">No results found</div>
              )}
            </div>
          )}
        </div>
      ))}

      {message && (
        <div
          className={`p-3 rounded text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={saving || !hasChanges}
        className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
      </button>

      {!hasChanges && (
        <p className="text-xs text-center text-gray-500">Using default assignments</p>
      )}
    </div>
  )
}
