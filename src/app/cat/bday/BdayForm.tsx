'use client'

import { useRef, useState } from 'react'

interface BirthdayEntry {
  name: string
  month: string
  day: string
  year: string
}

interface AnniversaryEntry {
  names: string
  month: string
  day: string
  year: string
}

const CHAR_LIMIT = 200

const CURRENT_YEAR = new Date().getFullYear()
const TODAY_ISO = new Date().toISOString().slice(0, 10)

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Descending so the most likely picks (recent decades) are near the top of
// a native <select> dropdown -- no year is preselected either way (see
// blank placeholder option below), this only affects scroll distance.
// 1900 is a generous floor; nobody submitting to this form was born or
// married earlier than that.
const YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i)

// Separate Month/Day/Year selects, each starting on a blank placeholder,
// replace what used to be a native <input type="date">. That native picker
// (especially iOS Safari's wheel) opens showing TODAY as its starting
// position when the field has no value -- someone scrolling month/day to
// their actual birthdate but not thinking to also scroll the year wheel
// silently submits a birthdate in the current year. Caught 2026-09-29
// across several wtsn.me/cat/bday submissions. Three explicit selects with
// no default selection make that slip impossible: there's no wheel to
// leave untouched, and a blank year can't be submitted at all.
function daysInMonthFor(monthStr: string, yearStr: string): number {
  const month = monthStr ? parseInt(monthStr, 10) : 0
  if (!month) return 31
  const year = yearStr ? parseInt(yearStr, 10) : CURRENT_YEAR
  return new Date(year, month, 0).getDate()
}

function toIsoDate(month: string, day: string, year: string): string {
  if (!month || !day || !year) return ''
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

const HEADING_FONT = 'font-[family-name:var(--font-connect-card-heading)]'
const INPUT_FONT = 'font-[family-name:var(--font-connect-card-input)]'

const inputClass =
  `w-full bg-[#ebebeb] border-0 text-black placeholder-gray-500 rounded-lg px-3 py-3 text-base ${INPUT_FONT} focus:outline-none focus:ring-2 focus:ring-black/20 transition-shadow`
const selectClass = inputClass
const labelClass = `block text-black font-bold text-[15px] mb-2 ${HEADING_FONT}`

function CharCounter({ value }: { value: string }) {
  return (
    <div className="text-right text-xs text-gray-400 mt-1">
      {value.length}/{CHAR_LIMIT}
    </div>
  )
}

function DateSelects({
  month, day, year, onChange,
}: {
  month: string
  day: string
  year: string
  onChange: (field: 'month' | 'day' | 'year', value: string) => void
}) {
  const dayCount = daysInMonthFor(month, year)
  return (
    <div className="grid grid-cols-3 gap-2">
      <select value={month} onChange={e => onChange('month', e.target.value)} className={selectClass}>
        <option value="">Month</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select value={day} onChange={e => onChange('day', e.target.value)} className={selectClass}>
        <option value="">Day</option>
        {Array.from({ length: dayCount }, (_, i) => i + 1).map(d => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <select value={year} onChange={e => onChange('year', e.target.value)} className={selectClass}>
        <option value="">Year</option>
        {YEARS.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )
}

export default function BdayForm() {
  const [submittedByName, setSubmittedByName] = useState('')
  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([{ name: '', month: '', day: '', year: '' }])
  const [anniversaries, setAnniversaries] = useState<AnniversaryEntry[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Honeypot, same as ConnectCardForm.tsx -- invisible to a sighted or
  // keyboard-only human, filled blind by a bot that scrapes every <input>.
  const [website, setWebsite] = useState('')
  const renderedAtRef = useRef(Date.now())

  function addBirthday() {
    setBirthdays(prev => [...prev, { name: '', month: '', day: '', year: '' }])
  }

  function updateBirthday(index: number, field: keyof BirthdayEntry, value: string) {
    setBirthdays(prev => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)))
  }

  function removeBirthday(index: number) {
    setBirthdays(prev => prev.filter((_, i) => i !== index))
  }

  function addAnniversary() {
    setAnniversaries(prev => [...prev, { names: '', month: '', day: '', year: '' }])
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

    const cleanBirthdays = birthdays
      .filter(b => b.name.trim() || (b.month && b.day && b.year))
      .map(b => ({ name: b.name.trim(), date: toIsoDate(b.month, b.day, b.year) }))
    const cleanAnniversaries = anniversaries
      .filter(a => a.names.trim() || (a.month && a.day && a.year))
      .map(a => ({ names: a.names.trim(), date: toIsoDate(a.month, a.day, a.year) }))

    if (cleanBirthdays.length === 0 && cleanAnniversaries.length === 0) {
      setError('Add at least one birthday or anniversary before submitting.')
      return
    }
    if ([...cleanBirthdays, ...cleanAnniversaries].some(entry => entry.date && entry.date > TODAY_ISO)) {
      setError('One of the dates entered is in the future -- please double-check the month, day, and year.')
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
          Catalyst Birthdays
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
        Catalyst Birthdays
      </h1>

      <p className={`text-black font-normal text-[15px] leading-relaxed ${HEADING_FONT}`}>
        We want to celebrate with you and your family! Please add the
        birthdays and anniversary in your household below so we can keep
        them on file and make a bit of a fuss when the day comes. Please
        use first AND last names so we can match them to the right person.
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
        <label className={labelClass} htmlFor="submittedByName">Your First and Last Name *</label>
        <input
          id="submittedByName"
          type="text"
          required
          placeholder="First and Last Name"
          autoComplete="name"
          maxLength={CHAR_LIMIT}
          value={submittedByName}
          onChange={e => setSubmittedByName(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">
          So we can match these to the right family.
        </p>
        <CharCounter value={submittedByName} />
      </div>

      <fieldset className="space-y-3">
        <legend className={labelClass}>Family Birthdays</legend>
        <p className="text-xs text-gray-500 -mt-2">
          First and last name for each person, please.
        </p>
        <div className="space-y-3">
          {birthdays.map((b, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-2 items-start">
              <div>
                {i === 0 && (
                  <label className="block text-black font-bold text-xs mb-1">First and Last Name</label>
                )}
                <input
                  type="text"
                  placeholder="First and Last Name"
                  value={b.name}
                  onChange={e => updateBirthday(i, 'name', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                {i === 0 && (
                  <label className="block text-black font-bold text-xs mb-1">Birthdate</label>
                )}
                <DateSelects
                  month={b.month}
                  day={b.day}
                  year={b.year}
                  onChange={(field, value) => updateBirthday(i, field, value)}
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
        <p className="text-xs text-gray-500 -mt-2">
          First and last name for both spouses, please.
        </p>
        <div className="space-y-3">
          {anniversaries.map((a, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-2 items-start">
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
                <DateSelects
                  month={a.month}
                  day={a.day}
                  year={a.year}
                  onChange={(field, value) => updateAnniversary(i, field, value)}
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
