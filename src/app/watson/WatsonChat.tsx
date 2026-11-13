'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Markdown from './Markdown'
import { parseLines, replyNote, type ChatEvent } from './stream'

type Message = { id: string; role: 'user' | 'assistant'; content: string; note?: string; at: string }
type Chat = { id: string; title: string; model: string; updated_at: string; session_id?: string; pinned?: boolean; archived?: boolean; messages: Message[] }
type Summary = Pick<Chat, 'id' | 'title' | 'model' | 'updated_at' | 'pinned' | 'archived'>
const GearIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01A1.7 1.7 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01A1.7 1.7 0 0 0 20.91 10H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" /></svg>
type Model = { id: string; name: string }
type Recognition = { start: () => void; stop: () => void; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; continuous: boolean; interimResults: boolean }
type RecognitionWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }

const api = '/api/watson'
const now = () => new Date().toISOString()
const newChat = (model: string): Chat => ({ id: crypto.randomUUID(), title: 'New chat', model, updated_at: now(), session_id: crypto.randomUUID(), messages: [] })
const titleFor = (text: string) => text.trim().slice(0, 40).trim()

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init })
  if (!response.ok) throw new Error(`Watson returned ${response.status}`)
  return response.json() as Promise<T>
}

async function request(url: string, init: RequestInit): Promise<void> {
  const response = await fetch(url, { cache: 'no-store', ...init })
  if (!response.ok) throw new Error(`Watson returned ${response.status}`)
}

export default function WatsonChat() {
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [chat, setChat] = useState<Chat | null>(null)
  const chatRef = useRef<Chat | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [identity, setIdentity] = useState('')
  const [readAloud, setReadAloud] = useState(false)
  const [settings, setSettings] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const sendingRef = useRef(false)
  const [stream, setStream] = useState('')
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)
  const recognition = useRef<Recognition | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<string | null>(null)

  const showChat = (value: Chat | null) => { chatRef.current = value; selectedRef.current = value?.id || null; setChat(value) }
  const refresh = useCallback(async () => {
    if (sendingRef.current) return
    try {
      const list = (await json<{ chats: Summary[] }>(`${api}/chats`)).chats
      if (sendingRef.current) return
      setSummaries(list)
      const id = selectedRef.current
      if (id) {
        if (list.some(item => item.id === id)) {
          const latest = await json<Chat>(`${api}/chats/${id}`)
          if (selectedRef.current === id && !sendingRef.current) showChat(latest)
        }
        else showChat(null)
      }
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load chats') }
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([json<Model[]>(`${api}/models`), json<{ identity: string }>(`${api}/identity/default`)]).then(([items, defaultIdentity]) => {
      if (!active) return
      setModels(items)
      setIdentity(localStorage.getItem('watson-identity') ?? defaultIdentity.identity)
      setReadAloud(localStorage.getItem('watson-read-aloud') === 'true')
    }).catch(() => { if (active) setError('Could not load Watson settings. Check Tailscale.') })
    queueMicrotask(() => { if (active) void refresh() })
    const onFocus = () => { void refresh() }
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => { active = false; window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisible) }
  }, [refresh])

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [chat?.messages.length, stream, sending])

  async function save(value: Chat) {
    await request(`${api}/chats/${value.id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value) })
    setSummaries(current => [{ id: value.id, title: value.title, model: value.model, updated_at: value.updated_at, pinned: value.pinned === true, archived: value.archived === true }, ...current.filter(item => item.id !== value.id)].sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
  }

  async function create() {
    if (sendingRef.current) return
    const value = newChat(localStorage.getItem('watson-last-model') || models[0]?.id || '')
    try { await save(value); showChat(value); setDrawer(false); setError('') }
    catch { setError('Could not create chat') }
  }

  async function open(id: string) {
    if (sendingRef.current) return
    try { showChat(await json<Chat>(`${api}/chats/${id}`)); setDrawer(false); setError('') }
    catch { setError('Could not open chat') }
  }

  async function remove(id: string) {
    if (sendingRef.current || !window.confirm('Delete this chat?')) return
    try {
      await request(`${api}/chats/${id}`, { method: 'DELETE' })
      setSummaries(current => current.filter(item => item.id !== id))
      if (selectedRef.current === id) showChat(null)
      setError('')
    } catch { setError('Could not delete chat') }
  }

  async function patchChat(id: string, patch: Partial<Chat>) {
    if (sendingRef.current && selectedRef.current === id) return
    try {
      const base = chatRef.current?.id === id ? chatRef.current : await json<Chat>(`${api}/chats/${id}`)
      const updated = { ...base, ...patch, updated_at: now() }
      await save(updated)
      if (selectedRef.current === id) showChat(updated)
      setError('')
    } catch { setError('Could not update chat') }
  }

  function rename(item: Summary) {
    const title = window.prompt('Rename chat', item.title)?.trim()
    if (title) void patchChat(item.id, { title: title.slice(0, 200) })
  }

  async function changeModel(model: string) {
    const current = chatRef.current
    if (!current || sendingRef.current) return
    const updated = { ...current, model, updated_at: now() }
    try { await save(updated); showChat(updated); localStorage.setItem('watson-last-model', model) }
    catch { setError('Could not save model choice') }
  }

  async function send(retry?: { text: string; base: Chat }) {
    const text = retry ? retry.text : draft.trim()
    const current = retry ? retry.base : chatRef.current
    if (!text || !current || !current.model || sendingRef.current || listening) return
    // For a retry, base already ends with the user message, so history stops before it.
    const prior = retry ? current.messages.slice(0, -1) : current.messages
    const history = prior.slice(-20).map(({ role, content }) => ({ role, content }))
    const user: Message = { id: crypto.randomUUID(), role: 'user', content: text, at: now() }
    const pending: Chat = retry
      ? { ...current, session_id: crypto.randomUUID(), updated_at: now() }
      : { ...current, title: current.messages.length ? current.title : titleFor(text), updated_at: now(), messages: [...current.messages, user] }
    showChat(pending)
    if (!retry) setDraft('')
    setStream('')
    setError('')
    setSending(true)
    sendingRef.current = true
    let full = ''
    let done: Extract<ChatEvent, { type: 'done' }> | null = null
    let completed: Chat | null = null
    try {
      const response = await fetch(`${api}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ transcript: text, model: pending.model, session_id: pending.session_id, identity, history }) })
      if (!response.ok || !response.body) throw new Error(`Watson returned ${response.status}`)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let rest = ''
      const handle = (event: ChatEvent) => {
        if (event.type === 'token') { full += event.text; setStream(full) }
        if (event.type === 'done') { done = event; full = event.reply ?? full; setStream(full) }
        if (event.type === 'error') throw new Error(event.message)
      }
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        const parsed = parseLines(rest + decoder.decode(chunk.value, { stream: true }))
        rest = parsed.rest
        parsed.events.forEach(handle)
      }
      parseLines(rest + decoder.decode() + '\n').events.forEach(handle)
      if (!done) throw new Error('Watson ended the reply early')
      const result: Extract<ChatEvent, { type: 'done' }> = done
      completed = { ...pending, session_id: result.session_id || pending.session_id, updated_at: now(), messages: [...pending.messages, { id: crypto.randomUUID(), role: 'assistant', content: full, note: replyNote(result), at: now() }] }
      await save(completed)
      showChat(completed)
      setStream('')
      if (readAloud && full && 'speechSynthesis' in window) {
        speechSynthesis.cancel()
        speechSynthesis.speak(new SpeechSynthesisUtterance(full))
      }
    } catch (cause) {
      setError(`Could not finish reply. ${cause instanceof Error ? cause.message : ''}`)
      try { await save(completed || pending); if (completed) showChat(completed) }
      catch { setError('Could not save chat. Check Tailscale.') }
    } finally { sendingRef.current = false; setSending(false) }
  }

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  async function copyMessage(message: Message) {
    try { await navigator.clipboard.writeText(message.content) }
    catch {
      const area = document.createElement('textarea')
      area.value = message.content
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopiedId(message.id)
    setTimeout(() => setCopiedId(current => current === message.id ? null : current), 1500)
  }

  function speakMessage(message: Message) {
    if (!('speechSynthesis' in window)) { setError('Reading aloud is unavailable in this browser.'); return }
    if (speakingId === message.id) { speechSynthesis.cancel(); setSpeakingId(null); return }
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(message.content.replace(/[#*_`>]/g, ''))
    utterance.onend = () => setSpeakingId(current => current === message.id ? null : current)
    utterance.onerror = utterance.onend
    setSpeakingId(message.id)
    speechSynthesis.speak(utterance)
  }

  function retryLast() {
    const current = chatRef.current
    if (!current || sendingRef.current || current.messages.length < 2) return
    const last = current.messages[current.messages.length - 1]
    const asked = current.messages[current.messages.length - 2]
    if (last.role !== 'assistant' || asked.role !== 'user') return
    speechSynthesis?.cancel()
    setSpeakingId(null)
    void send({ text: asked.content, base: { ...current, messages: current.messages.slice(0, -1) } })
  }

  function toggleMic() {
    if (listening) { recognition.current?.stop(); return }
    const browser = window as RecognitionWindow
    const SpeechRecognition = browser.SpeechRecognition || browser.webkitSpeechRecognition
    if (!SpeechRecognition) { setError('Speech recognition is unavailable in this browser.'); return }
    const instance = new SpeechRecognition()
    instance.continuous = false
    instance.interimResults = true
    instance.onresult = event => { setDraft(Array.from(event.results).map(item => item[0].transcript).join('')) }
    instance.onend = () => setListening(false)
    instance.onerror = () => { setListening(false); setError('Microphone could not start.') }
    recognition.current = instance
    setListening(true)
    instance.start()
  }

  return <div className="flex h-[calc(100dvh-3.5rem)] min-h-[340px] bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    {drawer && <button className="fixed inset-0 z-20 bg-black/40 md:hidden" aria-label="Close chats" onClick={() => setDrawer(false)} />}
    <aside className={`${drawer ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200 bg-slate-50 pt-14 transition-transform dark:border-slate-800 dark:bg-slate-900 md:static md:translate-x-0 md:pt-0`}>
      <div className="flex items-center gap-2 p-3"><button onClick={create} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-left font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">+ New chat</button><button className="px-2 md:hidden" onClick={() => setDrawer(false)} aria-label="Close chats">✕</button></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">{[...summaries].filter(item => !item.archived).sort((a, b) => Number(b.pinned === true) - Number(a.pinned === true) || b.updated_at.localeCompare(a.updated_at)).map(item => <div key={item.id} className={`relative flex items-center rounded-lg ${chat?.id === item.id ? 'bg-slate-200 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}><button className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm" onClick={() => open(item.id)}>{item.pinned && <span aria-label="Pinned" title="Pinned">📌 </span>}{item.title || 'New chat'}</button><button className="px-3 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" aria-label={`Menu for ${item.title}`} aria-haspopup="menu" aria-expanded={menuId === item.id} onClick={() => setMenuId(menuId === item.id ? null : item.id)}>⋯</button>{menuId === item.id && <><button className="fixed inset-0 z-40 cursor-default" aria-label="Close menu" onClick={() => setMenuId(null)} /><div role="menu" className="absolute right-2 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900"><button role="menuitem" className="block w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setMenuId(null); rename(item) }}>Rename</button><button role="menuitem" className="block w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setMenuId(null); void patchChat(item.id, { pinned: !item.pinned }) }}>{item.pinned ? 'Unpin' : 'Pin'}</button><button role="menuitem" className="block w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setMenuId(null); void patchChat(item.id, { archived: true, pinned: false }) }}>Archive</button><button role="menuitem" className="block w-full px-3 py-2 text-left text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setMenuId(null); void remove(item.id) }}>Delete</button></div></>}</div>)}</div>
      <button onClick={() => { setSettings(true); setDrawer(false) }} className="border-t border-slate-200 px-5 py-4 text-left text-sm dark:border-slate-800"><span className="inline-flex items-center gap-2"><GearIcon /> Settings</span></button>
    </aside>
    <main className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800"><button className="md:hidden" aria-label="Open chats" onClick={() => setDrawer(true)}>☰</button><span className="min-w-0 flex-1 truncate font-medium">{chat?.title || 'Watson chat'}</span>{chat && <select aria-label="Model" value={chat.model} onChange={event => changeModel(event.target.value)} className="max-w-36 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900 sm:max-w-64"><option value="">Choose model</option>{models.map(model => <option value={model.id} key={model.id}>{model.name}</option>)}</select>}<button aria-label="Settings" onClick={() => setSettings(true)} className="p-1"><GearIcon /></button></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6"><div className="mx-auto max-w-3xl space-y-6">{!chat && <div className="pt-[15vh] text-center"><h1 className="text-3xl font-semibold">Talk with Watson</h1><p className="mt-3 text-slate-500">Open a chat or start a new one.</p><button className="mt-5 rounded-xl bg-[#064C7C] px-5 py-2 text-white" onClick={create}>New chat</button></div>}{chat?.messages.map(message => <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : ''}><div className={message.role === 'user' ? 'max-w-[90%] whitespace-pre-wrap rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800' : 'max-w-full'}>{message.role === 'assistant' ? <><div className="mb-1 text-xs font-semibold text-slate-500">Watson</div><Markdown source={message.content} />{message.note && <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{message.note}</div>}<div className="mt-1 flex items-center gap-1 text-slate-500"><button className="rounded-md px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => void copyMessage(message)} aria-label="Copy reply">{copiedId === message.id ? 'Copied' : 'Copy'}</button><button className="rounded-md px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => speakMessage(message)} aria-label={speakingId === message.id ? 'Stop reading' : 'Read reply aloud'}>{speakingId === message.id ? 'Stop' : 'Read aloud'}</button>{message === chat.messages[chat.messages.length - 1] && !sending && <button className="rounded-md px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800" onClick={retryLast} aria-label="Retry reply">Retry</button>}</div></> : message.content}</div></div>)}{sending && <div><div className="mb-1 text-xs font-semibold text-slate-500">Watson</div>{stream ? <Markdown source={stream} /> : <span className="text-sm text-slate-500">Thinking...</span>}</div>}{error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}<div ref={endRef} /></div></div>
      {chat && <div className="shrink-0 border-t border-slate-200 bg-white px-3 pt-3 dark:border-slate-800 dark:bg-slate-950" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}><div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-slate-300 p-2 shadow-sm dark:border-slate-700"><textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() } }} placeholder="Message Watson" aria-label="Message Watson" rows={2} className="min-h-12 max-h-40 flex-1 resize-none bg-transparent px-2 py-2 outline-none" /><button onClick={toggleMic} aria-label={listening ? 'Stop microphone' : 'Start microphone'} className={`rounded-lg px-2 py-2 ${listening ? 'bg-red-100 text-red-700' : ''}`}>🎙</button><button onClick={() => void send()} disabled={!draft.trim() || sending || !chat.model} className="rounded-xl bg-[#064C7C] px-4 py-2 text-white disabled:opacity-40" aria-label="Send message">↑</button></div><div className="mx-auto mt-1 max-w-3xl text-right text-xs text-slate-500">Enter to send · Shift+Enter for a new line</div></div>}
    </main>
    {settings && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-label="Settings" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">Settings</h2><button onClick={() => setSettings(false)} aria-label="Close settings">✕</button></div><label htmlFor="identity" className="mb-2 block text-sm font-medium">Identity</label><textarea id="identity" rows={5} value={identity} onChange={event => { setIdentity(event.target.value); localStorage.setItem('watson-identity', event.target.value) }} className="w-full rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-950" /><label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" checked={readAloud} onChange={event => { setReadAloud(event.target.checked); localStorage.setItem('watson-read-aloud', String(event.target.checked)); if (!event.target.checked) speechSynthesis.cancel() }} /> Read replies aloud</label>{(() => { const archived = summaries.filter(item => item.archived); return <div className="mt-5"><h3 className="mb-2 text-sm font-medium">Archived chats ({archived.length})</h3>{archived.length === 0 ? <p className="text-sm text-slate-500">Nothing archived.</p> : <ul className="max-h-48 space-y-1 overflow-y-auto">{archived.map(item => <li key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1 text-sm dark:bg-slate-800"><button className="min-w-0 flex-1 truncate py-1 text-left" onClick={() => { setSettings(false); void open(item.id) }}>{item.title || 'New chat'}</button><button className="py-1 text-[#064C7C] dark:text-sky-300" onClick={() => void patchChat(item.id, { archived: false })}>Unarchive</button><button className="py-1 text-red-600" onClick={() => void remove(item.id)}>Delete</button></li>)}</ul>}</div> })()}<button onClick={() => setSettings(false)} className="mt-6 rounded-lg bg-[#064C7C] px-4 py-2 text-white">Done</button></section></div>}
  </div>
}
