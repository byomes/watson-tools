'use client'

import { useEffect, useState } from 'react'
import { sortByLastName } from '@/lib/people'

export type SmsContact = { id: number; name: string; phone: string; source: 'mine' | 'church'; email?: string | null; note?: string | null; existing?: boolean }
type Colors = { surface: string; bg: string; ink: string; inkSoft: string; line: string; moss: string; clay: string }

async function contactsApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json' } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Contact request failed')
  return data
}

export function ContactEditor({ colors, contact, phone, onClose, onSaved, onDeleted }: {
  colors: Colors; contact?: SmsContact | null; phone?: string; onClose: () => void
  onSaved: (contact: SmsContact) => void; onDeleted?: (contact: SmsContact) => void
}) {
  const [name, setName] = useState(contact?.name ?? '')
  const [number, setNumber] = useState(contact?.phone ?? phone ?? '')
  const [email, setEmail] = useState(contact?.email ?? '')
  const [note, setNote] = useState(contact?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null)

  useEffect(() => {
    const vv = window.visualViewport
    const fit = () => setViewport({ height: vv?.height ?? window.innerHeight, top: vv?.offsetTop ?? 0 })
    const timer = window.setTimeout(fit, 0)
    vv?.addEventListener('resize', fit)
    vv?.addEventListener('scroll', fit)
    return () => { window.clearTimeout(timer); vv?.removeEventListener('resize', fit); vv?.removeEventListener('scroll', fit) }
  }, [])

  async function save() {
    if (!name.trim() || !number.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const saved = await contactsApi<SmsContact>(contact ? `/api/sms/contacts/own/${contact.id}` : '/api/sms/contacts/own', {
        method: contact ? 'PATCH' : 'POST',
        body: JSON.stringify({ name: name.trim(), phone: number.trim(), email: email?.trim() || undefined, note: note?.trim() || undefined }),
      })
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save contact')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!contact || !onDeleted || busy || !window.confirm(`Delete ${contact.name}?`)) return
    setBusy(true)
    setError('')
    try {
      await contactsApi(`/api/sms/contacts/own/${contact.id}`, { method: 'DELETE' })
      onDeleted(contact)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete contact')
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full border rounded-lg px-3 py-2 text-sm'
  const fieldStyle = { borderColor: colors.line, background: colors.surface, color: colors.ink }
  return (
    <div className="fixed left-0 right-0 z-50 flex items-end justify-center bg-black/40" style={{ top: viewport?.top ?? 0, height: viewport?.height ?? '100dvh' }}>
      <div className="w-full max-w-md rounded-t-2xl p-5 flex flex-col gap-3 overflow-y-auto" style={{ background: colors.surface, color: colors.ink, maxHeight: viewport ? viewport.height * 0.9 : '90dvh', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}>
        <h3 className="text-base font-semibold">{contact ? 'Edit contact' : 'Add contact'}</h3>
        <label className="text-xs">Name<input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={field} style={fieldStyle} /></label>
        <label className="text-xs">Phone<input value={number} onChange={(e) => setNumber(e.target.value)} readOnly={Boolean(phone && !contact)} inputMode="tel" className={field} style={fieldStyle} /></label>
        <label className="text-xs">Email (optional)<input value={email ?? ''} onChange={(e) => setEmail(e.target.value)} type="email" className={field} style={fieldStyle} /></label>
        <label className="text-xs">Note (optional)<textarea value={note ?? ''} onChange={(e) => setNote(e.target.value)} rows={2} className={field} style={fieldStyle} /></label>
        {error && <p className="text-xs" style={{ color: colors.clay }}>{error}</p>}
        <div className="flex items-center gap-2 justify-end">
          {contact && onDeleted && <button disabled={busy} onClick={remove} className="mr-auto text-sm" style={{ color: colors.clay }}>Delete</button>}
          <button onClick={onClose} className="text-sm px-3 py-2" style={{ color: colors.inkSoft }}>Cancel</button>
          <button disabled={busy || !name.trim() || !number.trim()} onClick={save} className="text-sm px-3 py-2 rounded-lg text-white disabled:opacity-40" style={{ background: colors.moss }}>Save</button>
        </div>
      </div>
    </div>
  )
}

export function ContactsPanel({ colors, onBack, onSaved, onDeleted }: {
  colors: Colors; onBack: () => void; onSaved: (contact: SmsContact) => void; onDeleted: (contact: SmsContact) => void
}) {
  const [query, setQuery] = useState('')
  const [contacts, setContacts] = useState<SmsContact[]>([])
  const [selected, setSelected] = useState<SmsContact | null>(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      contactsApi<{ contacts: SmsContact[] }>(`/api/sms/contacts?${query.trim() ? `q=${encodeURIComponent(query.trim())}` : 'all=1'}`)
        .then((data) => { if (!cancelled) { setContacts(data.contacts); setError('') } })
        .catch(() => { if (!cancelled) setError('Could not load contacts') })
    }, query ? 250 : 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query])

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: colors.bg, color: colors.ink }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: colors.line }}>
        <button onClick={onBack} className="text-sm" style={{ color: colors.moss }}>← Messages</button>
        <h2 className="flex-1 text-center text-sm font-semibold">Contacts</h2>
        <button onClick={() => setAdding(true)} className="text-sm font-medium" style={{ color: colors.moss }}>Add</button>
      </div>
      <div className="p-4"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts" className="w-full rounded-lg border px-3 py-2 text-sm" style={{ background: colors.surface, borderColor: colors.line, color: colors.ink }} /></div>
      {error && <p className="px-4 text-xs" style={{ color: colors.clay }}>{error}</p>}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
        {sortByLastName(contacts).map((contact) => (
          <button key={`${contact.source}-${contact.id}`} disabled={contact.source !== 'mine'} onClick={() => setSelected(contact)} className="w-full flex items-center gap-2 border-b py-3 text-left" style={{ borderColor: colors.line }}>
            <span className="flex-1 min-w-0"><span className="block text-sm font-medium truncate">{contact.name}</span><span className="block text-xs" style={{ color: colors.inkSoft }}>{contact.phone}</span></span>
            <span className="text-xs rounded-full px-2 py-0.5" style={{ background: colors.surface, color: colors.inkSoft }}>{contact.source === 'church' ? 'Church' : 'Mine'}</span>
          </button>
        ))}
      </div>
      {(adding || selected) && <ContactEditor key={selected?.id ?? 'new'} colors={colors} contact={selected} onClose={() => { setAdding(false); setSelected(null) }} onSaved={(saved) => { setContacts((prev) => [...prev.filter((c) => !(c.source === 'mine' && c.id === saved.id)), saved]); if (selected && selected.phone !== saved.phone) onDeleted(selected); onSaved(saved); setAdding(false); setSelected(null) }} onDeleted={(deleted) => { setContacts((prev) => prev.filter((c) => !(c.source === 'mine' && c.id === deleted.id))); onDeleted(deleted); setSelected(null) }} />}
    </div>
  )
}
