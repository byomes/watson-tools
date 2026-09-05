'use client'

import { useEffect, useRef, useState } from 'react'

type Campus = 'wilmington' | 'online'

interface StoredProfile {
  campus: Campus
  firstName: string
  lastName: string
  email: string
  phone: string
}

const STORAGE_KEY = 'catalyst_connect_card_profile'
const CHAR_LIMIT = 3000

const NEXT_STEP_OPTIONS = [
  'I want to start following Jesus',
  'I want to get baptized',
  'I want help growing in my faith',
  'I want to become a Catalyst Partner',
  'I want to join a small group',
  'I want to join a ministry team',
]

// Font families, colors, radii, and fill below are extracted from the live
// Subsplash form's computed styles (Playwright), not approximated by eye —
// see the connect-card visual-parity pass commit for the extraction method.
// Heading font is Montserrat standing in for Proxima Nova (paid, see layout.tsx).
const HEADING_FONT = 'font-[family-name:var(--font-connect-card-heading)]'
const INPUT_FONT = 'font-[family-name:var(--font-connect-card-input)]'

// text-base (16px), not text-sm (14px) -- iOS Safari auto-zooms the viewport
// on focus for any field under 16px. Fixing font-size here (not
// maximum-scale/user-scalable on the viewport meta tag) keeps pinch-zoom
// available everywhere else on the page for anyone who needs it.
const inputClass =
  `w-full bg-[#ebebeb] border-0 text-black placeholder-gray-500 rounded-lg px-3 py-3 text-base ${INPUT_FONT} focus:outline-none focus:ring-2 focus:ring-black/20 transition-shadow`
const labelClass = `block text-black font-bold text-[15px] mb-2 ${HEADING_FONT}`
const checkboxRowClass = 'flex items-start gap-3'
// No accent-color override — the live form doesn't set one either (its radio/
// checkbox "blue" is just the browser's own default accent-color: auto, not
// a deliberate brand color), so native default rendering is the faithful match.
const checkboxClass = 'mt-0.5 shrink-0 w-4 h-4 cursor-pointer'
const checkboxLabelClass = `text-black font-normal text-[16.5px] leading-relaxed cursor-pointer ${HEADING_FONT}`

function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  // iOS/browser autofill inserts E.164-ish values ("+13025590000") in a
  // single change event with the full string, not keystroke-by-keystroke —
  // strip the leading US country code before masking, or it occupies the
  // first area-code digit slot and shifts every digit after it by one.
  // Only strip when it's unambiguous (exactly 11 digits, leading 1) — don't
  // guess or truncate for anything else, so a genuinely different-length
  // (e.g. non-US) number isn't silently mangled.
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1)
  }
  if (digits.length === 0) return ''
  if (digits.length < 4) return `(${digits}`
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function readStoredProfile(): StoredProfile | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      (parsed.campus === 'wilmington' || parsed.campus === 'online') &&
      typeof parsed.firstName === 'string' &&
      typeof parsed.lastName === 'string' &&
      typeof parsed.email === 'string' &&
      typeof parsed.phone === 'string'
    ) {
      return parsed as StoredProfile
    }
    return null
  } catch {
    return null
  }
}

function CharCounter({ value }: { value: string }) {
  return (
    <div className="text-right text-xs text-gray-400 mt-1">
      {value.length}/{CHAR_LIMIT}
    </div>
  )
}

export default function ConnectCardForm() {
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

  const [hasStoredProfile, setHasStoredProfile] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const profile = readStoredProfile()
    if (profile) {
      setCampus(profile.campus)
      setFirstName(profile.firstName)
      setLastName(profile.lastName)
      setEmail(profile.email)
      setPhone(profile.phone)
      setHasStoredProfile(true)
    }
    return () => {
      if (successTimeout.current) clearTimeout(successTimeout.current)
    }
  }, [])

  function handleClear() {
    window.localStorage.removeItem(STORAGE_KEY)
    setCampus(null)
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setHasStoredProfile(false)
  }

  function toggleNextStep(option: string) {
    setNextSteps(prev =>
      prev.includes(option) ? prev.filter(s => s !== option) : [...prev, option],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/cat/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campus,
          firstName,
          lastName,
          email,
          phone: phone || null,
          comment: comment || null,
          nextSteps,
          firstSunday,
          howHeard: howHeard || null,
          restrictToLeadership,
          prayerRequest: prayerRequest || null,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      // Persist only the five-field identity whitelist for next time (kiosk
      // reuse on a later page load). localStorage.setItem is synchronous, so
      // this is guaranteed to complete before the redirect below fires.
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ campus, firstName, lastName, email, phone }),
      )
      setHasStoredProfile(true)

      // Clear weekly-fresh fields only — identity fields stay filled for a
      // shared kiosk device. Never persist any of these to localStorage.
      setComment('')
      setNextSteps([])
      setFirstSunday(false)
      setHowHeard('')
      setRestrictToLeadership(false)
      setPrayerRequest('')

      setSuccess(true)
      if (successTimeout.current) clearTimeout(successTimeout.current)
      successTimeout.current = setTimeout(() => setSuccess(false), 6000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <h1 className={`flex items-center gap-2 text-[28px] font-extrabold tracking-[-0.7px] text-[#222222] ${HEADING_FONT}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/catalyst-c-logo.jpg" alt="" className="h-7 w-7 rounded-md shrink-0" />
        Catalyst Connect Card
      </h1>

      {error && (
        <p className={`text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 ${INPUT_FONT}`}>
          {error}
        </p>
      )}
      {success && (
        <p className={`text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-3 ${INPUT_FONT}`}>
          Thanks! Your connect card was submitted.
        </p>
      )}

      {hasStoredProfile && (
        <button
          type="button"
          onClick={handleClear}
          className={`text-xs text-gray-500 underline underline-offset-2 hover:text-gray-800 ${INPUT_FONT}`}
        >
          Not you? Clear
        </button>
      )}

      <fieldset>
        <legend className={labelClass}>Where did you attend with us? *</legend>
        <div className="space-y-2">
          <label className={checkboxRowClass}>
            <input
              type="radio"
              name="campus"
              value="wilmington"
              required
              checked={campus === 'wilmington'}
              onChange={() => setCampus('wilmington')}
              className={checkboxClass}
            />
            <span className={checkboxLabelClass}>Wilmington Campus</span>
          </label>
          <label className={checkboxRowClass}>
            <input
              type="radio"
              name="campus"
              value="online"
              required
              checked={campus === 'online'}
              onChange={() => setCampus('online')}
              className={checkboxClass}
            />
            <span className={checkboxLabelClass}>Online Campus</span>
          </label>
        </div>
      </fieldset>

      {campus && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="firstName">First Name *</label>
              <input
                id="firstName"
                type="text"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="lastName">Last Name *</label>
              <input
                id="lastName"
                type="text"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="(___) ___-____"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="comment">Do you have a question/comment?</label>
            <textarea
              id="comment"
              rows={3}
              maxLength={CHAR_LIMIT}
              autoComplete="off"
              value={comment}
              onChange={e => setComment(e.target.value)}
              className={inputClass}
            />
            <CharCounter value={comment} />
          </div>

          <fieldset>
            <legend className={labelClass}>Are you ready to take a Next Step this week?</legend>
            <div className="space-y-2">
              {NEXT_STEP_OPTIONS.map(option => (
                <label key={option} className={checkboxRowClass}>
                  <input
                    type="checkbox"
                    name="nextSteps"
                    checked={nextSteps.includes(option)}
                    onChange={() => toggleNextStep(option)}
                    className={checkboxClass}
                  />
                  <span className={checkboxLabelClass}>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={labelClass}>Is this your first Sunday with us?</legend>
            <label className={checkboxRowClass}>
              <input
                type="checkbox"
                name="firstSunday"
                checked={firstSunday}
                onChange={e => setFirstSunday(e.target.checked)}
                className={checkboxClass}
              />
              <span className={checkboxLabelClass}>Yes it is!</span>
            </label>

            {firstSunday && (
              <div className="mt-3 ml-7">
                <label className={labelClass} htmlFor="howHeard">
                  Please share who/how you heard about Catalyst:
                </label>
                <textarea
                  id="howHeard"
                  rows={3}
                  maxLength={CHAR_LIMIT}
                  autoComplete="off"
                  value={howHeard}
                  onChange={e => setHowHeard(e.target.value)}
                  className={inputClass}
                />
                <CharCounter value={howHeard} />
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className={labelClass}>
              Prayer requests are shared with our church family. Please let us know if you
              want your request shared with leadership only.
            </legend>
            <label className={checkboxRowClass}>
              <input
                type="checkbox"
                name="restrictToLeadership"
                checked={restrictToLeadership}
                onChange={e => setRestrictToLeadership(e.target.checked)}
                className={checkboxClass}
              />
              <span className={checkboxLabelClass}>Please restrict my request to leadership only.</span>
            </label>
          </fieldset>

          <div>
            <label className={labelClass} htmlFor="prayerRequest">
              How can we pray for you this week?
            </label>
            <textarea
              id="prayerRequest"
              rows={3}
              maxLength={CHAR_LIMIT}
              autoComplete="off"
              value={prayerRequest}
              onChange={e => setPrayerRequest(e.target.value)}
              className={inputClass}
            />
            <CharCounter value={prayerRequest} />
          </div>
        </div>
      )}

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
