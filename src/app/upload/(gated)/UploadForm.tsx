'use client'

import { useState } from 'react'

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Choose a file first')
      return
    }
    setPending(true)
    setError(null)

    const body = new FormData()
    body.set('file', file)
    body.set('note', note)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Upload failed')
        setPending(false)
        return
      }
      setDone(file.name)
    } catch {
      setError('Upload failed')
      setPending(false)
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="text-black dark:text-white font-medium">Uploaded</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{done}</p>
        <button
          type="button"
          onClick={() => {
            setDone(null)
            setFile(null)
            setNote('')
          }}
          className="mt-6 text-sm text-gray-500 dark:text-gray-400 underline"
        >
          Upload another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        disabled={pending}
        className="block w-full text-sm text-black dark:text-white file:mr-4 file:rounded-lg file:border-0 file:bg-gray-100 file:dark:bg-gray-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-black file:dark:text-white"
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={pending}
        placeholder="Note (what project is this for?)"
        className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
      />
      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={pending || !file}
        className="w-full rounded-lg bg-black dark:bg-white text-white dark:text-black py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {pending ? 'Uploading…' : 'Upload'}
      </button>
    </form>
  )
}
