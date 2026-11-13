'use client'

import { useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { slashChoices, slashQuery, type Skill } from './composerLogic'

export type Attachment = { id: string; name: string; type: string; size: number; kind: string }
export type ChatTools = { web_search: boolean; thinking: boolean }

type Props = {
  draft: string
  onDraft: (value: string) => void
  attachments: Attachment[]
  uploading: boolean
  onFiles: (files: File[]) => void
  onRemove: (id: string) => void
  skills: Skill[]
  tools: ChatTools
  onTools: (value: ChatTools) => void
  onNewChat: () => void
  sending: boolean
  listening: boolean
  modelReady: boolean
  onSend: () => void
  onStop: () => void
  onMic: () => void
}

export default function Composer(props: Props) {
  const [menu, setMenu] = useState(false)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const photo = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const choices = slashChoices(props.draft, props.skills)
  const slashOpen = slashQuery(props.draft) !== null

  function chooseSkill(skill: Skill) {
    props.onDraft(`Use the ${skill.name} skill to `)
    setMenu(false)
    textarea.current?.focus()
  }

  function chooseAction(id: string) {
    if (id === 'new') props.onNewChat()
    if (id === 'web') props.onTools({ ...props.tools, web_search: !props.tools.web_search })
    if (id === 'thinking') props.onTools({ ...props.tools, thinking: !props.tools.thinking })
    if (id !== 'new') props.onDraft('')
    setMenu(false)
    textarea.current?.focus()
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) props.onFiles(Array.from(event.target.files))
    event.target.value = ''
    setMenu(false)
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') { setMenu(false); if (slashOpen) props.onDraft(''); return }
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (slashOpen && choices.length) {
      const choice = choices[0]
      if (choice.kind === 'skill') chooseSkill(choice)
      else chooseAction(choice.id)
    } else if (!slashOpen) props.onSend()
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files.length) props.onFiles(Array.from(event.dataTransfer.files))
  }

  return <div className="shrink-0 border-t border-slate-200 bg-white px-3 pt-3 dark:border-slate-800 dark:bg-slate-950" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
    <input ref={file} type="file" multiple className="hidden" aria-label="Attach file" onChange={selectFiles} />
    <input ref={photo} type="file" accept="image/*" multiple className="hidden" aria-label="Attach photo" onChange={selectFiles} />
    <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Take photo" onChange={selectFiles} />
    <div className={`relative mx-auto max-w-3xl rounded-2xl border p-2 shadow-sm ${dragging ? 'border-[#064C7C] bg-sky-50 dark:bg-slate-800' : 'border-slate-300 dark:border-slate-700'}`} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={drop}>
      {(props.attachments.length > 0 || props.uploading) && <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto px-1 pb-2">
        {props.attachments.map(item => <div key={item.id} className="flex max-w-48 items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1 text-xs dark:border-slate-700 dark:bg-slate-800">
          {item.kind === 'image' && <Image unoptimized src={`/api/watson/uploads/${item.id}`} alt="" width={36} height={36} className="h-9 w-9 rounded object-cover" />}
          <span className="truncate" title={item.name}>{item.name}</span>
          <button onClick={() => props.onRemove(item.id)} aria-label={`Remove ${item.name}`} className="px-1 text-slate-500">✕</button>
        </div>)}
        {props.uploading && <span className="px-2 py-2 text-xs text-slate-500">Uploading...</span>}
      </div>}
      {slashOpen && <div role="listbox" aria-label="Slash commands" className="absolute bottom-full left-0 z-20 mb-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        {choices.length ? choices.map(choice => <button key={`${choice.kind}-${choice.id}`} role="option" aria-selected="false" className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => choice.kind === 'skill' ? chooseSkill(choice) : chooseAction(choice.id)}><span className="font-medium">{choice.label}</span><span className="ml-2 text-xs text-slate-500">{choice.description}</span></button>) : <p className="px-3 py-2 text-sm text-slate-500">No commands found</p>}
      </div>}
      {menu && <><button className="fixed inset-0 z-20 cursor-default" aria-label="Close plus menu" onClick={() => { setMenu(false); setSkillsOpen(false) }} /><div className="absolute bottom-full left-0 z-30 mb-2 w-56 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => file.current?.click()}>Attach file</button>
        <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => photo.current?.click()}>Attach photo</button>
        <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => camera.current?.click()}>Take photo</button>
        <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setSkillsOpen(!skillsOpen)} aria-expanded={skillsOpen}>Skills ›</button>
        {skillsOpen && <div className="max-h-40 overflow-y-auto border-t border-slate-200 dark:border-slate-700">{props.skills.length ? props.skills.map(skill => <button key={skill.id} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800" title={skill.description} onClick={() => chooseSkill(skill)}>{skill.name}</button>) : <p className="px-3 py-2 text-slate-500">No skills available</p>}</div>}
        <div className="border-t border-slate-200 px-3 pt-2 text-xs font-medium text-slate-500 dark:border-slate-700">Tools</div>
        <label className="flex cursor-pointer items-center gap-2 px-3 py-2"><input type="checkbox" checked={props.tools.web_search} onChange={event => props.onTools({ ...props.tools, web_search: event.target.checked })} /> Web search</label>
        <label className="flex cursor-pointer items-center gap-2 px-3 py-2"><input type="checkbox" checked={props.tools.thinking} onChange={event => props.onTools({ ...props.tools, thinking: event.target.checked })} /> Extended thinking</label>
      </div></>}
      <div className="flex items-end gap-1 sm:gap-2">
        <button onClick={() => setMenu(!menu)} aria-label="Open plus menu" aria-expanded={menu} className="shrink-0 rounded-lg px-2 py-2 text-xl leading-none hover:bg-slate-100 dark:hover:bg-slate-800">+</button>
        <textarea ref={textarea} value={props.draft} onChange={event => props.onDraft(event.target.value)} onKeyDown={keyDown} onPaste={event => { const files = Array.from(event.clipboardData.files); if (files.length) { event.preventDefault(); props.onFiles(files) } }} placeholder="Message Watson" aria-label="Message Watson" rows={2} className="min-h-12 max-h-40 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 outline-none sm:px-2" />
        <button onClick={props.onMic} aria-label={props.listening ? 'Stop microphone' : 'Start microphone'} className={`shrink-0 rounded-lg px-1 py-2 sm:px-2 ${props.listening ? 'bg-red-100 text-red-700' : ''}`}>🎙</button>
        {props.sending ? <button onClick={props.onStop} className="shrink-0 rounded-xl bg-red-700 px-3 py-2 text-white" aria-label="Stop reply">■</button> : <button onClick={props.onSend} disabled={(!props.draft.trim() && !props.attachments.length) || props.uploading || !props.modelReady || props.listening || slashOpen} className="shrink-0 rounded-xl bg-[#064C7C] px-3 py-2 text-white disabled:opacity-40 sm:px-4" aria-label="Send message">↑</button>}
      </div>
    </div>
    <div className="mx-auto mt-1 max-w-3xl text-right text-xs text-slate-500">Enter to send · Shift+Enter for a new line</div>
  </div>
}
