'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'

type Book = {
  title: string
  authors: string[]
  isbn: string
  publisher?: string
  date?: string
  pages?: string | number
  cover?: string
}
type Candidate = Book & { read_as?: string; matched?: boolean; owned?: boolean }
type Lookup = { isbn: string; book: Book | null; owned: boolean; error?: string }

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/books/${path}`, body === undefined ? undefined : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 401) {
    window.location.href = '/books/login'
    throw new Error('Signed out')
  }
  if (res.status === 429) throw new Error('Slow down a moment')
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Request failed')
  return data as T
}

function isIsbn(code: string) {
  return /^(97[89]\d{10}|\d{9}[\dX])$/.test(code)
}

// Downscale to keep uploads small (Vercel body limit) while text stays readable.
async function shrink(file: File, maxEdge = 1800): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

const btn = 'rounded-lg px-4 py-3 text-base font-semibold disabled:opacity-50'
const primary = `${btn} bg-blue-600 text-white`
const secondary = `${btn} bg-gray-200 text-black dark:bg-gray-800 dark:text-white`

export default function BooksApp() {
  const [tab, setTab] = useState<'scan' | 'shelf'>('scan')
  const [added, setAdded] = useState<string[]>([])

  return (
    <div className="min-h-screen bg-white text-black dark:bg-gray-950 dark:text-white pb-16"
         style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto max-w-md px-4">
        <h1 className="py-4 text-xl font-bold">Watson Books</h1>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button className={tab === 'scan' ? primary : secondary} onClick={() => setTab('scan')}>Scan barcode</button>
          <button className={tab === 'shelf' ? primary : secondary} onClick={() => setTab('shelf')}>Shelf photo</button>
        </div>
        {tab === 'scan'
          ? <Scanner onAdded={(t) => setAdded((a) => [t, ...a])} />
          : <Shelf onAdded={(ts) => setAdded((a) => [...ts, ...a])} />}
        {added.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Added this session ({added.length})</h2>
            <ul className="space-y-1 text-sm">{added.map((t, i) => <li key={i}>✓ {t}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  )
}

function BookCard({ b, note }: { b: Book; note?: string }) {
  return (
    <div className="flex gap-3">
      {b.cover
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={b.cover} alt="" className="h-24 w-16 flex-none rounded object-cover bg-gray-200" />
        : <div className="h-24 w-16 flex-none rounded bg-gray-200 dark:bg-gray-800" />}
      <div className="min-w-0">
        <div className="font-semibold leading-tight">{b.title}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{b.authors.join(', ')}</div>
        <div className="text-xs text-gray-500">{[b.publisher, b.date?.slice(0, 4)].filter(Boolean).join(' · ')}</div>
        {note && <div className="mt-1 text-sm font-medium text-amber-600">{note}</div>}
      </div>
    </div>
  )
}

function Scanner({ onAdded }: { onAdded: (title: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const busyRef = useRef(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<Lookup | null>(null)
  const [manual, setManual] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const stop = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setRunning(false)
  }, [])
  useEffect(() => stop, [stop])

  const lookup = useCallback(async (code: string) => {
    if (busyRef.current) return
    busyRef.current = true
    setMsg('Looking up…')
    try {
      const r = await api<Lookup>('lookup', { isbn: code })
      setResult(r)
      setMsg(r.book ? '' : `No book data found for ${code}`)
    } catch (e) {
      setMsg((e as Error).message)
      busyRef.current = false
    }
  }, [])

  async function start() {
    setMsg('')
    setResult(null)
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const { BarcodeFormat, DecodeHintType } = await import('@zxing/library')
      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A])
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
      setRunning(true)
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current!,
        (res) => {
          const code = res?.getText()
          if (code && isIsbn(code)) lookup(code)
        },
      )
    } catch {
      setRunning(false)
      setMsg('Camera unavailable. Allow camera access for this site, or type the ISBN below.')
    }
  }

  async function add() {
    if (!result?.book) return
    setSaving(true)
    try {
      const r = await api<{ results: { title: string; error?: string }[] }>('add', { books: [{ isbn: result.isbn }] })
      const first = r.results[0]
      if (first.error) throw new Error(first.error)
      onAdded(result.book.title)
      next()
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function next() {
    setResult(null)
    setMsg('')
    busyRef.current = false
  }

  return (
    <div>
      <div className={`relative overflow-hidden rounded-xl bg-black ${running ? '' : 'hidden'}`}>
        <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
      </div>
      {!running && <button className={`${primary} w-full`} onClick={start}>Start camera</button>}
      {running && !result && <button className={`${secondary} mt-3 w-full`} onClick={stop}>Stop camera</button>}

      {msg && <p className="mt-3 text-sm text-amber-600">{msg}</p>}

      {result?.book && (
        <div className="mt-4 rounded-xl border border-gray-300 p-3 dark:border-gray-700">
          <BookCard b={result.book} note={result.owned ? 'Already in your library' : undefined} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className={secondary} onClick={next}>{result.owned ? 'Next' : 'Skip'}</button>
            {!result.owned && <button className={primary} disabled={saving} onClick={add}>{saving ? 'Adding…' : 'Add'}</button>}
          </div>
        </div>
      )}
      {result && !result.book && <button className={`${secondary} mt-3 w-full`} onClick={next}>Scan next</button>}

      <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); const c = manual.replace(/[^0-9X]/gi, '').toUpperCase(); if (isIsbn(c)) { busyRef.current = false; lookup(c); setManual('') } else setMsg('That is not a valid ISBN') }}>
        <input value={manual} onChange={(e) => setManual(e.target.value)} inputMode="numeric" placeholder="Type an ISBN"
               className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-3 text-base dark:border-gray-700" />
        <button className={secondary} type="submit">Look up</button>
      </form>
    </div>
  )
}

type ShelfJob = { name: string; state: string; error?: string; candidates: Candidate[] }

function Shelf({ onAdded }: { onAdded: (titles: string[]) => void }) {
  const [jobs, setJobs] = useState<ShelfJob[]>([])
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const keyOf = (c: Candidate) => c.isbn || c.title

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setMsg('')
    const list = Array.from(files)
    // One photo at a time: the vision model is slow and the site rate-limits.
    for (const [i, file] of list.entries()) {
      const idx = jobs.length + i
      const label = `Photo ${idx + 1}`
      setJobs((j) => [...j, { name: label, state: 'uploading', candidates: [] }])
      const update = (patch: Partial<ShelfJob>) =>
        setJobs((j) => j.map((x, n) => (n === idx ? { ...x, ...patch } : x)))
      try {
        const { job } = await api<{ job: string }>('shelf', { image: await shrink(file) })
        for (;;) {
          await new Promise((r) => setTimeout(r, 3500))
          const s = await api<{ state: string; error?: string; candidates: Candidate[] }>(`shelf/${job}`)
          update({ state: s.state, error: s.error })
          if (s.state === 'done') {
            update({ candidates: s.candidates })
            setPicked((p) => {
              const n = { ...p }
              for (const c of s.candidates) n[keyOf(c)] = !c.owned && !!c.matched
              return n
            })
            break
          }
          if (s.state === 'error') break
        }
      } catch (e) {
        update({ state: 'error', error: (e as Error).message })
      }
    }
    setBusy(false)
  }

  const all = jobs.flatMap((j) => j.candidates)
  const chosen = all.filter((c) => picked[keyOf(c)])

  async function addChosen() {
    setBusy(true)
    try {
      const r = await api<{ results: { title: string; error?: string }[] }>('add', {
        books: chosen.map((c) => (c.isbn ? { isbn: c.isbn } : { title: c.title, authors: c.authors, publisher: c.publisher, date: c.date, pages: c.pages })),
      })
      const ok = r.results.filter((x) => !x.error)
      onAdded(ok.map((x) => x.title))
      setMsg(`Added ${ok.length}${r.results.length > ok.length ? `, ${r.results.length - ok.length} failed` : ''}.`)
      const done = new Set(chosen.map(keyOf))
      setJobs((j) => j.map((x) => ({ ...x, candidates: x.candidates.filter((c) => !done.has(keyOf(c))) })))
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <label className={`${primary} block w-full cursor-pointer text-center ${busy ? 'opacity-50' : ''}`}>
        Take or choose shelf photos
        <input type="file" accept="image/*" multiple className="hidden" disabled={busy}
               onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
      </label>
      <p className="mt-2 text-xs text-gray-500">Keep spines facing the camera and text readable. Reading a photo takes a minute or two; you review every match before anything is added.</p>

      {jobs.map((j, i) => (
        <p key={i} className="mt-3 text-sm">
          {j.name}: {j.state === 'done' ? `${j.candidates.length} books found` : j.state === 'error' ? `failed (${j.error})` : j.state + '…'}
        </p>
      ))}
      {msg && <p className="mt-3 text-sm text-amber-600">{msg}</p>}

      {all.length > 0 && (
        <div className="mt-4 space-y-3">
          {all.map((c) => (
            <label key={keyOf(c)} className="flex items-start gap-3 rounded-xl border border-gray-300 p-3 dark:border-gray-700">
              <input type="checkbox" className="mt-1 h-5 w-5" checked={!!picked[keyOf(c)]}
                     onChange={(e) => setPicked((p) => ({ ...p, [keyOf(c)]: e.target.checked }))} />
              <BookCard b={c} note={c.owned ? 'Possibly already in your library' : !c.matched ? `Unverified (read as "${c.read_as}")` : undefined} />
            </label>
          ))}
          <button className={`${primary} sticky bottom-4 w-full`} disabled={busy || chosen.length === 0} onClick={addChosen}>
            Add {chosen.length} selected
          </button>
        </div>
      )}
    </div>
  )
}
