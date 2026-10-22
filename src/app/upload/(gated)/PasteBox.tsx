'use client'

import { useState } from 'react'

// Paste text straight to Watson (saved to a locked private file on the Beelink, never shown again here).
export default function PasteBox() {
  const [text, setText] = useState('')
  const [label, setLabel] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setPending(true)
    setStatus(null)
    try {
      const res = await fetch('/api/upload/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, label }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setText('')
        setLabel('')
        setStatus('Saved privately')
      } else {
        setStatus(data.error || 'Could not save')
      }
    } catch {
      setStatus('Could not save')
    }
    setPending(false)
  }

  return (
    <form onSubmit={save} className="space-y-3 mt-10 pt-6 border-t border-gray-200 dark:border-gray-800">
      <p className="text-sm font-medium text-black dark:text-white">Paste text</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">Saved to a private file on Watson. It is not shown again here.</p>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        disabled={pending}
        placeholder="Label (what is this?)"
        autoComplete="off"
        className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={pending}
        rows={9}
        placeholder="Paste anything here"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="block w-full min-h-48 resize-y rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
      />
      {status && <p className="text-sm text-gray-600 dark:text-gray-300">{status}</p>}
      <button
        type="submit"
        disabled={pending || !text.trim()}
        className="w-full rounded-lg bg-black dark:bg-white text-white dark:text-black py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save text'}
      </button>
    </form>
  )
}
