'use client'
import { useState } from 'react'

const ADD_NEW = '__add_new__'

export function EditableSelect({
  value,
  options,
  placeholder,
  onChange,
  onAddOption,
}: {
  value: string
  options: string[]
  placeholder: string
  onChange: (value: string) => void
  onAddOption: (value: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  function cancelAdd() {
    setAdding(false)
    setDraft('')
  }

  function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = draft.trim()
    if (trimmed) {
      onAddOption(trimmed)
      onChange(trimmed)
    }
    cancelAdd()
  }

  if (adding) {
    return (
      <form onSubmit={submitAdd} className="flex items-center gap-1">
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancelAdd()
          }}
          placeholder={placeholder}
          className="w-full min-w-0 bg-white border-2 border-blue-700 rounded-md px-2 py-1.5 text-sm text-gray-900 focus:outline-none"
        />
        <button type="submit" className="shrink-0 text-sm font-semibold text-blue-700 hover:text-blue-900 px-1">
          Add
        </button>
        <button
          type="button"
          onClick={cancelAdd}
          className="shrink-0 text-sm text-gray-500 hover:text-gray-800 px-1"
          aria-label="Cancel"
        >
          ✕
        </button>
      </form>
    )
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === ADD_NEW) {
          setAdding(true)
        } else {
          onChange(e.target.value)
        }
      }}
      className="w-full bg-white border-2 border-gray-300 rounded-md px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-700"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
      <option value={ADD_NEW}>+ Add new…</option>
    </select>
  )
}
