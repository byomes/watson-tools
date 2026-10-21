'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SECTIONS } from './items'

type ItemState = { done?: boolean; note?: string; photos?: string[] }
type State = { updated: number; general: string; items: Record<string, ItemState> }

const LS_KEY = 'chiunited-field-v1'
const EMPTY: State = { updated: 0, general: '', items: {} }

function loadLocal(): State {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY
  } catch {
    return EMPTY
  }
}

// Downscale to ~1800px JPEG so each photo stays small enough to upload over
// cellular and under Vercel's request-body cap, yet still legible for model plates.
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Could not read photo'))
      i.src = url
    })
    const scale = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function FieldSheet() {
  const [state, setState] = useState<State>(EMPTY)
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState('Loading...')
  const [busy, setBusy] = useState(0)
  const stateRef = useRef(state)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  stateRef.current = state

  useEffect(() => {
    const local = loadLocal()
    fetch('/api/cat/scratch/field/state')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const remote: State | null = j?.state ?? null
        const pick = remote && remote.updated > local.updated ? { ...EMPTY, ...remote } : local
        setState(pick)
        setStatus(remote ? 'Synced' : 'Offline copy loaded')
      })
      .catch(() => {
        setState(local)
        setStatus('Offline copy loaded')
      })
      .finally(() => setReady(true))
  }, [])

  const push = useCallback(async () => {
    try {
      const r = await fetch('/api/cat/scratch/field/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: stateRef.current }),
      })
      setStatus(r.ok ? 'Saved' : 'Saved on this phone only (will retry)')
    } catch {
      setStatus('Saved on this phone only (will retry)')
    }
  }, [])

  const update = useCallback(
    (fn: (s: State) => State) => {
      setState((prev) => {
        const next = { ...fn(prev), updated: Date.now() }
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(next))
        } catch {}
        stateRef.current = next
        return next
      })
      setStatus('Saving...')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(push, 1000)
    },
    [push],
  )

  // Retry a failed save when the phone comes back online.
  useEffect(() => {
    const on = () => push()
    window.addEventListener('online', on)
    return () => window.removeEventListener('online', on)
  }, [push])

  const setItem = (id: string, patch: ItemState) =>
    update((s) => ({ ...s, items: { ...s.items, [id]: { ...s.items[id], ...patch } } }))

  const addPhotos = async (id: string, files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      setBusy((b) => b + 1)
      try {
        const content_base64 = await shrink(file)
        const r = await fetch('/api/cat/scratch/field/photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: id, content_base64 }),
        })
        const j = await r.json().catch(() => ({}))
        if (!r.ok || !j.name) throw new Error('upload failed')
        update((s) => {
          const cur = s.items[id] ?? {}
          return { ...s, items: { ...s.items, [id]: { ...cur, photos: [...(cur.photos ?? []), j.name] } } }
        })
      } catch {
        setStatus('A photo did not upload. Check signal and add it again.')
      } finally {
        setBusy((b) => b - 1)
      }
    }
  }

  const all = SECTIONS.flatMap((s) => s.items)
  const doneCount = all.filter((i) => state.items[i.id]?.done).length
  const photoCount = Object.values(state.items).reduce((n, i) => n + (i.photos?.length ?? 0), 0)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-black dark:text-white pb-24">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-950/95 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold leading-tight">ChiUnited Field Sheet</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {doneCount}/{all.length} done · {photoCount} photos
              {busy > 0 ? ` · uploading ${busy}...` : ''}
            </p>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 text-right">{status}</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Thu Oct 22, fact-finding. Tick items, type notes, snap photos. Everything saves to Watson as you go. Do not type
          passwords here.
        </p>

        {!ready && <p className="text-sm text-gray-500">Loading...</p>}

        {SECTIONS.map((sec) => (
          <section key={sec.id} className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">{sec.title}</h2>
            {sec.items.map((item) => {
              const st = state.items[item.id] ?? {}
              return (
                <div
                  key={item.id}
                  className={`rounded-lg border p-3 space-y-2 ${
                    st.done
                      ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={!!st.done}
                      onChange={(e) => setItem(item.id, { done: e.target.checked })}
                      className="mt-1 h-6 w-6 shrink-0"
                    />
                    <span className="text-sm leading-snug">
                      {item.text}
                      {item.hint && <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.hint}</span>}
                    </span>
                  </label>
                  <textarea
                    value={st.note ?? ''}
                    onChange={(e) => setItem(item.id, { note: e.target.value })}
                    placeholder="Notes"
                    rows={2}
                    className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-base"
                  />
                  <div className="flex items-center gap-3">
                    <label className="inline-block rounded bg-gray-900 dark:bg-gray-100 text-white dark:text-black text-sm font-medium px-3 py-2 cursor-pointer">
                      Add photo
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          addPhotos(item.id, e.target.files)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    {(st.photos?.length ?? 0) > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">{st.photos!.length} saved</span>
                    )}
                  </div>
                </div>
              )
            })}
          </section>
        ))}

        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">Anything else</h2>
          <textarea
            value={state.general}
            onChange={(e) => update((s) => ({ ...s, general: e.target.value }))}
            placeholder="Loose notes, names, surprises"
            rows={6}
            className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-base"
          />
          <label className="inline-block rounded bg-gray-900 dark:bg-gray-100 text-white dark:text-black text-sm font-medium px-3 py-2 cursor-pointer">
            Add photo (general)
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addPhotos('general', e.target.files)
                e.target.value = ''
              }}
            />
          </label>
        </section>
      </div>
    </div>
  )
}
