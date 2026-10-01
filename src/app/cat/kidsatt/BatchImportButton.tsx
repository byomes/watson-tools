'use client'

import { useRef, useState } from 'react'

// Self-contained button + dialog -- carries its own open/close state so
// page.tsx (a server component) can drop it next to the title with no
// wiring of its own. Upload-only for now: it just gets the CSV safely
// onto the Watson box (see /api/cat/kidsatt/import); parsing it into
// actual attendance rows is a follow-up once a real export has been
// uploaded through this dialog.
export default function BatchImportButton() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedName, setSavedName] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setFile(null)
    setBusy(false)
    setError(null)
    setSavedName(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function close() {
    setOpen(false)
    reset()
  }

  async function upload() {
    if (!file) return
    setBusy(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/cat/kidsatt/import', { method: 'POST', body: form })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(body.error ?? 'Could not upload this file. Try again.')
      return
    }
    setSavedName(body.filename ?? file.name)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        Batch import
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[1px]"
          onClick={close}
        >
          <div
            className="w-full sm:w-96 sm:rounded-2xl rounded-t-2xl bg-white dark:bg-gray-900 border-t-2 sm:border-2 border-gray-200 dark:border-gray-700 shadow-2xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">Batch import attendance</div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="p-1 -mr-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path
                    fillRule="evenodd"
                    d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <div className="px-4 py-5">
              {savedName ? (
                <>
                  <p className="text-sm text-green-700 dark:text-green-400 mb-4">
                    Uploaded <span className="font-mono text-xs break-all">{savedName}</span>. It&apos;s saved and
                    ready to be processed.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 text-xs font-semibold"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Upload a kids check-in .csv export. Nothing is applied to attendance yet — this just saves the
                    file.
                  </p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null) }}
                    className="w-full mb-3 text-sm text-black dark:text-white file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 dark:file:bg-gray-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-black dark:file:text-white"
                  />
                  {error && <p className="text-red-600 dark:text-red-400 text-xs mb-3">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={upload}
                      disabled={!file || busy}
                      className="rounded-lg bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      {busy ? 'Uploading…' : 'Upload'}
                    </button>
                    <button
                      type="button"
                      onClick={close}
                      disabled={busy}
                      className="text-xs text-gray-500 dark:text-gray-400 underline"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
