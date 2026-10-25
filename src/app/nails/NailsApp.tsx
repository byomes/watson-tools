'use client'

import { Cormorant_Garamond } from 'next/font/google'
import { useRef, useState } from 'react'

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600'] })

// Blush & Cream palette picked for the shop (2026-10-25).
const C = { bg: '#FFF8F3', ink: '#3B2A2F', rose: '#D98A9C', soft: '#F6DCE0', line: '#EBCFD5', bad: '#B3261E' }

async function api(body: Record<string, unknown>) {
  const res = await fetch('/api/nails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

// Phone photos are 3-8MB; shrink to 1800px JPEG in the browser before upload.
async function shrink(file: File): Promise<{ name: string; b64: string }> {
  const toB64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
      r.onerror = reject
      r.readAsDataURL(blob)
    })
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.86))
    return { name: file.name.replace(/\.[^.]+$/, '') + '.jpg', b64: await toB64(blob) }
  } catch {
    if (file.size > 3 * 1024 * 1024) throw new Error(`${file.name} could not be prepared`)
    return { name: file.name, b64: await toB64(file) }
  }
}

// eslint-disable-next-line @next/next/no-img-element
const Logo = () => <img src="/nails/icon-192.png" alt="" width={72} height={72} className="mx-auto mb-3 rounded-2xl" style={{ boxShadow: `0 2px 10px ${C.line}` }} />

function LockScreen({ onOpen }: { onOpen: () => void }) {
  const [pin, setPin] = useState('')
  const [code, setCode] = useState('')
  const [mode, setMode] = useState<'pin' | 'code'>('pin')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [locked, setLocked] = useState(false)

  async function submitPin(p: string) {
    setBusy(true); setMsg('')
    const r = await api({ action: 'unlock', pin: p })
    setBusy(false)
    if (r.ok && r.data.ok) return onOpen()
    setPin('')
    if (r.data.locked) {
      setLocked(true)
      setMsg(`Too many tries. Wait ${Math.ceil((r.data.retry_in ?? 900) / 60)} minutes, or get a text code below.`)
    } else setMsg('That PIN is not right.')
  }

  function press(k: string) {
    if (busy) return
    if (k === '<') return setPin(pin.slice(0, -1))
    if (pin.length >= 4) return
    const next = pin + k
    setPin(next)
    if (next.length === 4) submitPin(next)
  }

  async function sendCode() {
    setBusy(true); setMsg('')
    const r = await api({ action: 'code' })
    setBusy(false)
    if (r.ok && r.data.sent) { setMode('code'); setMsg('Code sent to your phone.') }
    else setMsg(r.data.error || 'Could not send a code.')
  }

  async function submitCode() {
    setBusy(true); setMsg('')
    const r = await api({ action: 'verify', code: code.trim() })
    setBusy(false)
    if (r.ok && r.data.ok) return onOpen()
    setMsg(r.data.error || 'That code is not right.')
  }

  const key = { background: '#fff', border: `1.5px solid ${C.line}`, color: C.ink } as const

  return (
    <div className="w-full max-w-xs text-center">
      <Logo />
      <h1 className={`${serif.className} text-4xl`} style={{ color: C.ink }}>Nails With Allie</h1>
      {mode === 'pin' ? (
        <>
          <p className="mt-1 mb-6 text-sm" style={{ color: C.ink, opacity: 0.7 }}>Enter your 4-digit PIN</p>
          <div className="flex justify-center gap-4 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="w-4 h-4 rounded-full" style={{ border: `2px solid ${C.rose}`, background: i < pin.length ? C.rose : 'transparent' }} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '<'].map((k, i) =>
              k ? (
                <button key={i} type="button" onClick={() => press(k)} disabled={busy} className="py-3 rounded-xl text-2xl" style={key} aria-label={k === '<' ? 'Delete' : k}>
                  {k === '<' ? '⌫' : k}
                </button>
              ) : <span key={i} />)}
          </div>
          <button type="button" onClick={sendCode} disabled={busy} className="mt-6 text-sm underline" style={{ color: C.ink }}>
            {locked ? 'Text me a code' : 'Forgot it? Text me a code'}
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 mb-4 text-sm" style={{ color: C.ink, opacity: 0.7 }}>Enter the 6-digit code from your text</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric" autoComplete="one-time-code"
            className="w-full text-center text-2xl tracking-widest rounded-xl py-3" style={key} aria-label="Code"
          />
          <button type="button" onClick={submitCode} disabled={busy || code.length !== 6} className="mt-4 w-full rounded-xl py-3 text-white disabled:opacity-50" style={{ background: C.rose }}>
            Unlock
          </button>
          <button type="button" onClick={() => { setMode('pin'); setMsg('') }} className="mt-4 text-sm underline" style={{ color: C.ink }}>Back to PIN</button>
        </>
      )}
      <p role="alert" className="mt-4 min-h-6 text-sm" style={{ color: msg.startsWith('Code sent') ? C.ink : C.bad }}>{msg}</p>
    </div>
  )
}

function Intake() {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!files.length) return setError('Add at least one photo.')
    if (!text.trim()) return setError('Tell me about the set first.')
    setBusy(true); setError('')
    try {
      const s = await api({ action: 'start', title, description: text })
      if (s.status === 401) { location.reload(); return }
      if (!s.ok) throw new Error(s.data.error || 'Could not start')
      const id = s.data.id as string
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading photo ${i + 1} of ${files.length}...`)
        const p = await shrink(files[i])
        const r = await api({ action: 'photo', id, filename: p.name, content_base64: p.b64 })
        if (!r.ok) throw new Error(r.data.error || `Photo ${i + 1} failed`)
      }
      const f = await api({ action: 'finish', id })
      if (!f.ok) throw new Error(f.data.error || 'Could not finish')
      setDone(files.length)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    }
    setBusy(false); setProgress('')
  }

  if (done) {
    return (
      <div className="text-center max-w-sm">
        <h1 className={`${serif.className} text-4xl`} style={{ color: C.ink }}>Got it!</h1>
        <p className="mt-3" style={{ color: C.ink }}>Your {done === 1 ? 'photo and description were' : `${done} photos and description were`} saved.</p>
        <button type="button" className="mt-6 rounded-xl px-6 py-3 text-white" style={{ background: C.rose }}
          onClick={() => { setDone(0); setFiles([]); setTitle(''); setText('') }}>Add another set</button>
      </div>
    )
  }

  const field = { background: '#fff', border: `1.5px solid ${C.line}`, color: C.ink } as const
  return (
    <form onSubmit={submit} className="w-full max-w-md space-y-4">
      <Logo />
      <h1 className={`${serif.className} text-4xl text-center`} style={{ color: C.ink }}>Add a new set</h1>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Set name (optional)" className="w-full rounded-xl px-4 py-3" style={field} />
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setError('') }} />
      <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-xl px-4 py-6" style={{ background: C.soft, border: `1.5px dashed ${C.rose}`, color: C.ink }}>
        {files.length ? `${files.length} photo${files.length === 1 ? '' : 's'} chosen. Tap to change` : 'Tap to add photos'}
      </button>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={4000}
        placeholder="Tell me about this set: shape, length, colors, price, sizes, how long it takes to make..." className="w-full rounded-xl px-4 py-3" style={field} />
      <button type="submit" disabled={busy} className="w-full rounded-xl py-3 text-white text-lg disabled:opacity-60" style={{ background: C.rose }}>
        {busy ? progress || 'Sending...' : 'Send it'}
      </button>
      <p role="alert" className="min-h-6 text-sm text-center" style={{ color: C.bad }}>{error}</p>
    </form>
  )
}

export default function NailsApp({ unlocked }: { unlocked: boolean }) {
  const [open, setOpen] = useState(unlocked)
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10" style={{ background: C.bg }}>
      {open ? <Intake /> : <LockScreen onOpen={() => setOpen(true)} />}
    </main>
  )
}
