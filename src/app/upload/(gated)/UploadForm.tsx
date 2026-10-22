'use client'

import { useState } from 'react'

export default function UploadForm() {
  const [files, setFiles] = useState<File[]>([])
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState<string[] | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (files.length === 0) {
      setError('Choose at least one file first')
      return
    }
    setPending(true)
    setError(null)
    setProgress(0)

    const sent: string[] = []
    const failed: string[] = []
    for (const file of files) {
      const body = new FormData()
      body.set('file', file)
      body.set('note', note)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body })
        const data = await res.json().catch(() => ({}))
        if (res.ok) sent.push(file.name)
        else failed.push(`${file.name} (${data.error || 'failed'})`)
      } catch {
        failed.push(`${file.name} (failed)`)
      }
      setProgress(sent.length + failed.length)
    }

    setPending(false)
    if (failed.length) {
      setError(`Failed: ${failed.join(', ')}`)
      setFiles(files.filter((f) => !sent.includes(f.name)))
      if (sent.length) setDone(sent)
      return
    }
    setDone(sent)
  }

  if (done && !error) {
    return (
      <div className="text-center">
        <p className="text-black dark:text-white font-medium">
          Uploaded {done.length} {done.length === 1 ? 'file' : 'files'}
        </p>
        <button
          type="button"
          onClick={() => {
            setDone(null)
            setFiles([])
            setNote('')
          }}
          className="mt-6 text-sm text-gray-500 dark:text-gray-400 underline"
        >
          Upload more
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="file"
        multiple
        onChange={(e) => {
          setFiles(Array.from(e.target.files ?? []))
          setDone(null)
          setError(null)
        }}
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
        disabled={pending || files.length === 0}
        className="w-full rounded-lg bg-black dark:bg-white text-white dark:text-black py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {pending
          ? `Uploading ${progress} of ${files.length}…`
          : files.length > 1
            ? `Upload ${files.length} files`
            : 'Upload'}
      </button>
    </form>
  )
}
