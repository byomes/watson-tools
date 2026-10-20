'use client'

import { useEffect, useRef, useState } from 'react'

// Voice editor (2026-10-19, writing ministry, not Catalyst): one sentence at a time, approve / speak a
// rewrite / tap to type. Edits save to this browser (localStorage) and to
// Watson (~/watson/data/voice_editor/, via /api/voice-editor/*); the newest
// copy wins on load. Spoken text gets a punctuation/grammar pass from Watson.

type Block = { type: string; text?: string; label?: string; sentences?: string[] }
type Entry = { source: string; docId: string; blocks: Block[] }
type State = { text: string; status: 'pending' | 'approved' | 'edited' | 'spoken'; prev?: string; approved?: boolean; deleted?: boolean }

// Minimal typing for the browser speech API, which isn't in lib.dom.
type Rec = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start: () => void
  stop: () => void
}

const STORE = 'sentence-edit-entry1-v1'
const ENTRY_ID = 'entry1'
type Saved = { savedAt: number; st: Record<string, State> }

export default function Editor({ entry }: { entry: Entry }) {
  const keyOf = (b: number, s: number) => `${b}.${s}`
  const [st, setSt] = useState<Record<string, State>>({})
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [listening, setListening] = useState<string | null>(null)
  const [heard, setHeard] = useState('')
  const [msg, setMsg] = useState('')
  const [polishing, setPolishing] = useState<Record<string, boolean>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const lastSaved = useRef('')
  const recRef = useRef<Rec | null>(null)
  const heardRef = useRef('')

  useEffect(() => {
    const init: Record<string, State> = {}
    entry.blocks.forEach((b, bi) => {
      if (b.sentences) b.sentences.forEach((t, si) => (init[keyOf(bi, si)] = { text: t, status: 'pending' }))
    })
    const merge = (saved: Record<string, State> | undefined) => {
      const out = { ...init }
      for (const k of Object.keys(saved ?? {})) if (out[k]) out[k] = saved![k]
      return out
    }
    let local: Saved = { savedAt: 0, st: {} }
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || '{}')
      local = raw.st ? raw : { savedAt: 0, st: raw }
    } catch {}
    // localStorage only exists client-side, so state has to be hydrated in an effect.
    /* eslint-disable react-hooks/set-state-in-effect */
    setSt(merge(local.st))
    setLoaded(true)
    /* eslint-enable react-hooks/set-state-in-effect */

    // Then ask Watson; whichever copy was saved last wins.
    let cancelled = false
    fetch(`/api/voice-editor/load?entry=${ENTRY_ID}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const remote: Saved | null = d?.state ?? null
        if (cancelled || !remote || !remote.st || remote.savedAt <= local.savedAt) return
        lastSaved.current = JSON.stringify(remote.st)
        setSt(merge(remote.st))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [entry])

  useEffect(() => {
    if (!loaded) return
    const json = JSON.stringify(st)
    if (json === lastSaved.current) return
    const savedAt = Date.now()
    try {
      localStorage.setItem(STORE, JSON.stringify({ savedAt, st }))
    } catch {}
    const t = setTimeout(() => {
      setSaveState('saving')
      fetch('/api/voice-editor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry: ENTRY_ID, state: { savedAt, st }, assembled: assemble(st) }),
      })
        .then((r) => {
          if (!r.ok) throw new Error('save failed')
          lastSaved.current = json
          setSaveState('saved')
        })
        .catch(() => setSaveState('error'))
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st, loaded])

  function assemble(state: Record<string, State>) {
    return entry.blocks
      .map((b, bi) => {
        const sents = b.sentences
        if (!sents) return b.text ?? ''
        const body = sents
          .map((_, si) => state[keyOf(bi, si)])
          .filter((x) => x && !x.deleted)
          .map((x) => x.text)
          .join(' ')
        return b.label ? `${b.label} ${body}` : body
      })
      .join('\n\n')
  }

  async function polish(k: string, text: string) {
    setPolishing((p) => ({ ...p, [k]: true }))
    try {
      const r = await fetch('/api/voice-editor/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const d = await r.json()
      if (r.ok && d.changed && typeof d.text === 'string') {
        setSt((s) => {
          const cur = s[k]
          // Skip if the sentence was changed again while the model was thinking.
          if (!cur || cur.text !== text) return s
          return { ...s, [k]: { ...cur, text: d.text, status: cur.status === 'spoken' ? 'spoken' : 'edited', approved: false, prev: cur.prev ?? text } }
        })
      } else if (r.ok && d.reason === 'drifted') {
        setMsg('Cleanup would have changed too many words, so I left that sentence as you said it.')
      }
    } catch {
      setMsg('Cleanup is unavailable right now. Your text is unchanged.')
    } finally {
      setPolishing((p) => ({ ...p, [k]: false }))
    }
  }

  const set = (k: string, v: Partial<State>) => setSt((s) => ({ ...s, [k]: { ...s[k], ...v } }))

  function speak(k: string) {
    if (listening) {
      recRef.current?.stop()
      return
    }
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) {
      setMsg('This browser has no speech recognition. Use Chrome or Safari.')
      return
    }
    const rec = new Ctor()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = true
    rec.onresult = (e) => {
      // Each event carries the whole session's results, so rebuild the text
      // from scratch every time instead of appending (appending duplicated
      // every phrase on each update).
      let finalText = ''
      let interim = ''
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      heardRef.current = (finalText + interim).trim()
      setHeard(heardRef.current)
    }
    rec.onerror = (e) => setMsg(`Mic error: ${e.error}`)
    rec.onend = () => {
      const text = heardRef.current.trim()
      setListening(null)
      setHeard('')
      if (text) {
        const out = text.charAt(0).toUpperCase() + text.slice(1)
        setSt((s) => ({ ...s, [k]: { text: out, status: 'spoken', prev: s[k].prev ?? s[k].text } }))
        polish(k, out)
      }
    }
    recRef.current = rec
    setMsg('')
    heardRef.current = ''
    setHeard('')
    setListening(k)
    rec.start()
  }

  function saveEdit(k: string) {
    const t = draft.trim()
    if (t && t !== st[k].text) set(k, { text: t, status: 'edited', approved: false, prev: st[k].prev ?? st[k].text })
    setEditing(null)
  }

  const all = Object.values(st)
  const done = all.filter((s) => s.status !== 'pending' || s.deleted).length

  function copyEntry() {
    const out = assemble(st)
    navigator.clipboard.writeText(out).then(
      () => setMsg('Copied. Paste into the Google Doc.'),
      () => setMsg('Copy failed.'),
    )
  }

  const approvedStyle = 'border-l-4 border-green-500 bg-green-50 dark:bg-green-950/30'
  const badge: Record<State['status'], string> = {
    pending: '',
    approved: 'border-l-4 border-green-500 bg-green-50 dark:bg-green-950/30',
    edited: 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30',
    spoken: 'border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950/30',
  }
  const btn = 'rounded-lg px-4 py-2 text-sm font-medium active:scale-95'

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-black dark:text-white">
      <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 px-4 py-2 flex items-center justify-between gap-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {done} of {all.length} reviewed
          <span className="ml-3 text-xs">
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved to Watson' : saveState === 'error' ? 'Not saved to Watson yet' : ''}
          </span>
        </span>
        <button onClick={copyEntry} className={`${btn} bg-gray-900 text-white dark:bg-white dark:text-black`}>
          Copy entry
        </button>
      </div>
      {msg && <p className="px-4 pt-2 text-sm text-amber-600">{msg}</p>}

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {entry.blocks.map((b, bi) => {
          if (b.type === 'title') return <h1 key={bi} className="text-2xl font-bold font-serif">{b.text}</h1>
          if (b.type === 'heading') return <h2 key={bi} className="pt-6 text-sm font-bold tracking-wide text-gray-500">{b.text}</h2>
          return (
            <div key={bi} className="space-y-3">
              {b.label && <div className="text-sm text-gray-500">{b.label}</div>}
              {(b.sentences ?? []).map((_, si) => {
                const k = keyOf(bi, si)
                const s = st[k]
                if (!s) return null
                const isEd = editing === k
                const isMic = listening === k
                if (s.deleted) {
                  return (
                    <div key={k} className="rounded-lg p-3 border-l-4 border-red-400 bg-red-50 dark:bg-red-950/30 flex items-center justify-between gap-3">
                      <p className="text-sm font-serif line-through text-gray-500 line-clamp-2">{s.text}</p>
                      <button onClick={() => set(k, { deleted: false })} className={`${btn} shrink-0 bg-gray-200 dark:bg-gray-800`}>
                        Restore
                      </button>
                    </div>
                  )
                }
                return (
                  <div key={k} className={`rounded-lg p-3 ${s.approved ? approvedStyle : badge[s.status]} ${s.status === 'pending' ? 'border-l-4 border-gray-200 dark:border-gray-800' : ''}`}>
                    {isEd ? (
                      <textarea
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={Math.max(3, Math.ceil(draft.length / 45))}
                        className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-lg font-serif"
                      />
                    ) : (
                      <p
                        onClick={() => {
                          setDraft(s.text)
                          setEditing(k)
                        }}
                        className="text-lg leading-relaxed font-serif cursor-text"
                      >
                        {s.text}
                      </p>
                    )}
                    {polishing[k] && <p className="mt-2 text-sm italic text-gray-500">Adding punctuation...</p>}
                    {isMic && (
                      <p className="mt-2 text-sm italic text-red-600">Listening... {heard || 'say it your way, tap Stop when done'}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {isEd ? (
                        <>
                          <button onClick={() => saveEdit(k)} className={`${btn} bg-blue-600 text-white`}>Save</button>
                          <button onClick={() => setEditing(null)} className={`${btn} bg-gray-200 dark:bg-gray-800`}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => set(k, { approved: true, status: s.status === 'pending' ? 'approved' : s.status })}
                            className={`${btn} ${s.approved ? 'border-2 border-green-600 bg-white text-green-700 dark:bg-gray-950 dark:text-green-400' : 'bg-green-600 text-white'}`}
                          >
                            {s.approved ? '✓ Approved' : '✓ Approve'}
                          </button>
                          <button onClick={() => speak(k)} className={`${btn} ${isMic ? 'bg-red-600 text-white' : 'bg-purple-600 text-white'}`}>
                            {isMic ? '■ Stop' : '🎤 Speak'}
                          </button>
                          <button
                            onClick={() => polish(k, s.text)}
                            disabled={!!polishing[k]}
                            className={`${btn} bg-gray-200 dark:bg-gray-800 disabled:opacity-50`}
                          >
                            ✨ Polish
                          </button>
                          <button
                            onClick={() => set(k, { deleted: true })}
                            disabled={isMic}
                            className={`${btn} bg-red-600 text-white disabled:opacity-50`}
                          >
                            🗑 Delete
                          </button>
                          {s.prev !== undefined && (
                            <button
                              onClick={() => setSt((x) => ({ ...x, [k]: { text: s.prev!, status: 'pending' } }))}
                              className={`${btn} bg-gray-200 dark:bg-gray-800`}
                            >
                              ↺ Original
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </main>
    </div>
  )
}
