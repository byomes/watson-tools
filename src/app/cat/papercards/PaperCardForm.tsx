'use client'

import { useRef, useState } from 'react'

type Campus = 'Wilmington' | 'Online'

const CHAR_LIMIT = 3000

// Canonical step keys -- match jobs/connect_cards/shepherding_report.py's
// _STEP_NAMES and the next_steps.step column values used everywhere else in
// Watson. Labels match the wording on the live wcky /tools/connect-card form.
const NEXT_STEP_OPTIONS: { key: string; label: string }[] = [
  { key: 'follow_jesus', label: 'I want to start following Jesus' },
  { key: 'baptism', label: 'I want to get baptized' },
  { key: 'grow_faith', label: 'I want help growing in my faith' },
  { key: 'catalyst_partner', label: 'I want to become a Catalyst Partner' },
  { key: 'small_group', label: 'I want to join a small group' },
  { key: 'ministry_team', label: 'I want to join a ministry team' },
]

const labelClass = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1'
const inputClass =
  'w-full bg-white border-2 border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-700'
const checkboxRowClass = 'flex items-start gap-2'
const checkboxLabelClass = 'text-sm text-gray-800 leading-snug cursor-pointer'

function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1)
  }
  if (digits.length === 0) return ''
  if (digits.length < 4) return `(${digits}`
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function CharCounter({ value }: { value: string }) {
  return (
    <div className="text-right text-xs text-gray-400 mt-1">
      {value.length}/{CHAR_LIMIT}
    </div>
  )
}

// Local date, not UTC -- toISOString() would roll back a day for anyone
// west of UTC in the evening. Only used as a same-day starting point;
// Donna picks the real date the card was filled out.
function todayIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function PaperCardForm() {
  const [serviceDate, setServiceDate] = useState(todayIso())
  const [campus, setCampus] = useState<Campus | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [nextSteps, setNextSteps] = useState<string[]>([])
  const [firstSunday, setFirstSunday] = useState(false)
  const [howHeard, setHowHeard] = useState('')
  const [restrictToLeadership, setRestrictToLeadership] = useState(false)
  const [prayerRequest, setPrayerRequest] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const reloadTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function toggleNextStep(key: string) {
    setNextSteps((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!serviceDate) {
      setError('Please choose the date this card was filled out.')
      return
    }
    if (!campus) {
      setError('Please select a campus.')
      return
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/cat/papercards/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_date: serviceDate,
          campus,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          phone: phone || null,
          is_first_visit: firstSunday,
          how_heard: howHeard.trim() || null,
          next_steps: nextSteps,
          questions_comments: comment.trim() || null,
          prayer_request: prayerRequest.trim() || null,
          prayer_leadership_only: restrictToLeadership,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      setSuccess(true)
      if (reloadTimeout.current) clearTimeout(reloadTimeout.current)
      reloadTimeout.current = setTimeout(() => window.location.reload(), 3000)
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="border-2 border-green-300 bg-green-50 rounded-xl p-10 text-center">
        <p className="text-green-800 font-bold text-lg">Connect card logged ✓</p>
        <p className="text-green-700 text-sm mt-1">Loading a fresh form for the next card…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <div>
        <label className={labelClass} htmlFor="serviceDate">Date this card was filled out *</label>
        <input
          id="serviceDate"
          type="date"
          value={serviceDate}
          onChange={(e) => setServiceDate(e.target.value)}
          className={inputClass}
        />
      </div>

      <fieldset>
        <legend className={labelClass}>Where did they attend? *</legend>
        <div className="flex gap-4">
          <label className={checkboxRowClass}>
            <input
              type="radio"
              name="campus"
              checked={campus === 'Wilmington'}
              onChange={() => setCampus('Wilmington')}
              className="mt-0.5"
            />
            <span className={checkboxLabelClass}>Wilmington Campus</span>
          </label>
          <label className={checkboxRowClass}>
            <input
              type="radio"
              name="campus"
              checked={campus === 'Online'}
              onChange={() => setCampus('Online')}
              className="mt-0.5"
            />
            <span className={checkboxLabelClass}>Online Campus</span>
          </label>
        </div>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="firstName">First Name *</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="lastName">Last Name *</label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="phone">Phone Number</label>
        <input
          id="phone"
          type="tel"
          placeholder="(___) ___-____"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="comment">Question / Comment</label>
        <textarea
          id="comment"
          rows={3}
          maxLength={CHAR_LIMIT}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className={inputClass}
        />
        <CharCounter value={comment} />
      </div>

      <fieldset>
        <legend className={labelClass}>Next Step this week?</legend>
        <div className="space-y-2">
          {NEXT_STEP_OPTIONS.map((option) => (
            <label key={option.key} className={checkboxRowClass}>
              <input
                type="checkbox"
                checked={nextSteps.includes(option.key)}
                onChange={() => toggleNextStep(option.key)}
                className="mt-0.5"
              />
              <span className={checkboxLabelClass}>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelClass}>First Sunday?</legend>
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={firstSunday}
            onChange={(e) => setFirstSunday(e.target.checked)}
            className="mt-0.5"
          />
          <span className={checkboxLabelClass}>Yes, this was their first Sunday</span>
        </label>

        {firstSunday && (
          <div className="mt-3 ml-6">
            <label className={labelClass} htmlFor="howHeard">How did they hear about Catalyst?</label>
            <textarea
              id="howHeard"
              rows={2}
              maxLength={CHAR_LIMIT}
              value={howHeard}
              onChange={(e) => setHowHeard(e.target.value)}
              className={inputClass}
            />
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className={labelClass}>
          Prayer requests are shared with the church family unless restricted.
        </legend>
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            checked={restrictToLeadership}
            onChange={(e) => setRestrictToLeadership(e.target.checked)}
            className="mt-0.5"
          />
          <span className={checkboxLabelClass}>Restrict this request to leadership only</span>
        </label>
      </fieldset>

      <div>
        <label className={labelClass} htmlFor="prayerRequest">Prayer Request</label>
        <textarea
          id="prayerRequest"
          rows={3}
          maxLength={CHAR_LIMIT}
          value={prayerRequest}
          onChange={(e) => setPrayerRequest(e.target.value)}
          className={inputClass}
        />
        <CharCounter value={prayerRequest} />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-2.5 px-8 rounded-lg text-sm transition-colors"
      >
        {submitting ? 'Logging…' : 'Log Connect Card'}
      </button>
    </form>
  )
}
