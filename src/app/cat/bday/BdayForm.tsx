'use client'

import { useRef, useState } from 'react'

interface BirthdayEntry {
  name: string
  date: string
}

interface AnniversaryEntry {
  names: string
  date: string
}

const CHAR_LIMIT = 200

// Same reasoning as ConnectCardForm.tsx's identical constant: caps the
// date pickers at today so a mobile date wheel left untouched on the year
// digit can't silently submit a future-dated birthday/anniversary.
const TODAY_ISO = new Date().toISOString().slice(0, 10)

const HEADING_FONT = 'font-[family-name:var(--font-connect-card-heading)]'
const INPUT_FONT = 'font-[family-name:var(--font-connect-card-input)]'

const inputClass =
  `w-full bg-[#ebebeb] border-0 text-black placeholder-gray-500 rounded-lg px-3 py-3 text-base ${INPUT_FONT} focus:outline-none focus:ring-2 focus:ring-black/20 transition-shadow`
const labelClass = `block text-black font-bold text-[15px] mb-2 ${HEADING_FONT}`

function CharCounter({ value }: { value: string }) {
  return (
    <div className="text-right text-xs text-gray-400 mt-1">
      {value.length}/{CHAR_LIMIT}
    </div>
  )
}

export default function BdayForm() {
  const [submittedByName, setSubmittedByName] = useState('')
  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([{ name: '', date: '' }])
  const [anniversaries, setAnniversaries] = useState<AnniversaryEntry[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Honeypot, same as ConnectCardForm.tsx -- invisible to a sighted or
  // keyboard-only human, filled blind by a bot that scrapes every <input>.
  const [website, setWebsite] = useState('')
  const renderedAtRef = useRef(Date.now())

  function addBirthday() {
    setBirthdays(prev => [...prev, { name: '', date: '' }])
  }

  function updateBirthday(index: number, field: keyof BirthdayEntry, value: string) {
    setBirthdays(prev => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)))
  }

  function removeBirthday(index: number) {
    setBirthdays(prev => prev.filter((_, i) => i !== index))
  }

  function addAnniversary() {
    setAnniversaries(prev => [...prev, { names: '', date: '' }])
  }

  function updateAnniversary(index: number, field: keyof AnniversaryEntry, value: string) {
    setAnniversaries(prev => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)))
  }

  function removeAnniversary(index: number) {
    setAnniversaries(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const cleanBirthdays = birthdays.filter(b => b.name.trim() || b.date.trim())
    const cleanAnniversaries = anniversaries.filter(a => a.names.trim() || a.date.trim())
    if (cleanBirthdays.length === 0 && cleanAnniversaries.length === 0) {
      setError('Add at least one birthday or anniversary before submitting.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/cat/bday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submittedByName: submittedByName || null,
          birthdays: cleanBirthdays,
          anniversaries: cleanAnniversaries,
          website,
          renderedAt: renderedAtRef.current,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      setSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Same success pattern as ConnectCardForm.tsx -- the whole form is
  // replaced by the confirmation, nothing left to resubmit.
  if (success) {
    return (
      <div className="space-y-8">
        <h1 className={`flex items-center gap-[0.3em] whitespace-nowrap text-[clamp(1.05rem,5vw,1.75rem)] font-extrabold tracking-[-0.7px] text-[#222222] ${HEADING_FONT}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/catalyst-c-logo.jpg" alt="" className="h-[1em] w-[1em] rounded-md shrink-0" />
          Catalyst Birthdays &amp; Anniversaries
        </h1>
        <p className={`text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-3 ${INPUT_FONT}`}>
          Thanks! We can&apos;t wait to celebrate with you.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <h1 className={`flex items-center gap-[0.3em] whitespace-nowrap text-[clamp(1.05rem,5vw,1.75rem)] font-extrabold tracking-[-0.7px] text-[#222222] ${HEADING_FONT}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/catalyst-c-logo.jpg" alt="" className="h-[1em] w-[1em] rounded-md shrink-0" />
        Catalyst Birthdays &amp; Anniversaries
      </h1>

      <p className={`text-black font-normal text-[15px] leading-relaxed ${HEADING_FONT}`}>
        We want to celebrate with you and your family! Add every birthday and
        anniversary in your household below so we can keep them on file and
        make a bit of a fuss when the day comes.
      </p>

      {error && (
        <p className={`text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 ${INPUT_FONT}`}>
          {error}
        </p>
      )}

      {/* Honeypot -- visually hidden and unreachable by Tab. */}
      <div className="absolute left-[-9999px] top-auto w-px h-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={e => setWebsite(e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="submittedByName">Your Name</label>
        <input
          id="submittedByName"
          type="text"
          autoComplete="name"
          maxLength={CHAR_LIMIT}
          value={submittedByName}
          onChange={e => setSubmittedByName(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">
          Optional — helps us match these to the right family.
        </p>
        <CharCounter value={submittedByName} />
      </div>

      <fieldset className="space-y-3">
        <legend className={labelClass}>Birthdays</legend>
        <div className="space-y-3">
          {birthdays.map((b, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-start">
              <div>
                {i === 0 && (
                  <label className="block text-black font-bold text-xs mb-1">Name</label>
                )}
                <input
                  type="text"
                  placeholder="Name"
                  value={b.name}
                  onChange={e => updateBirthday(i, 'name', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                {i === 0 && (
                  <label className="block text-black font-bold text-xs mb-1">Birthdate</label>
                )}
                <input
                  type="date"
                  max={TODAY_ISO}
                  value={b.date}
                  onChange={e => updateBirthday(i, 'date', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className={i === 0 ? 'sm:pt-[26px]' : ''}>
                <button
                  type="button"
                  onClick={() => removeBirthday(i)}
                  aria-label="Remove birthday"
                  className="w-full sm:w-auto text-red-600 text-sm px-3 py-3 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addBirthday}
            className={`text-sm font-medium text-[#131313] underline underline-offset-2 hover:text-black ${HEADING_FONT}`}
          >
            + Add a Birthday
          </button>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={labelClass}>Anniversaries</legend>
        <div className="space-y-3">
          {anniversaries.map((a, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-start">
              <div>
                {i === 0 && (
                  <label className="block text-black font-bold text-xs mb-1">Couple&apos;s Names</label>
                )}
                <input
                  type="text"
                  placeholder="e.g. John & Jane Smith"
                  value={a.names}
                  onChange={e => updateAnniversary(i, 'names', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                {i === 0 && (
                  <label className="block text-black font-bold text-xs mb-1">Anniversary Date</label>
                )}
                <input
                  type="date"
                  max={TODAY_ISO}
                  value={a.date}
                  onChange={e => updateAnniversary(i, 'date', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className={i === 0 ? 'sm:pt-[26px]' : ''}>
                <button
                  type="button"
                  onClick={() => removeAnniversary(i)}
                  aria-label="Remove anniversary"
                  className="w-full sm:w-auto text-red-600 text-sm px-3 py-3 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addAnniversary}
            className={`text-sm font-medium text-[#131313] underline underline-offset-2 hover:text-black ${HEADING_FONT}`}
          >
            + Add an Anniversary
          </button>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={submitting}
        className={`w-full sm:w-auto bg-[#131313] hover:bg-black disabled:opacity-60 text-white font-medium py-3 px-10 rounded-full text-[15px] transition-colors ${HEADING_FONT}`}
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  )
}
