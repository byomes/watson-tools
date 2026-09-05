import { NextRequest, NextResponse } from 'next/server'
import { isToolLive } from '@/lib/requireLiveTool'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'
const SENDER_EMAIL = 'watson@williamckyomes.com'
const SENDER_NAME = 'Watson'

interface ConnectCardPayload {
  campus: 'wilmington' | 'online'
  firstName: string
  lastName: string
  email: string
  phone: string | null
  comment: string | null
  nextSteps: string[]
  firstSunday: boolean
  howHeard: string | null
  restrictToLeadership: boolean
  prayerRequest: string | null
}

// Numbers used by a spam bot that repeatedly resubmitted the same fake
// visitor (e.g. "Alluverr Alluvert" / ziecr@aol.com) — compared as digits
// only so formatting differences don't matter. Ported from the retired
// wcky /tools/connect-card route when this became the live form.
const BLOCKED_PHONE_DIGITS = new Set(['8006696607'])

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function campusLabel(campus: string): string {
  return campus === 'online' ? 'Online' : 'Wilmington'
}

function buildSubject(data: ConnectCardPayload): string {
  const flags: string[] = []
  if (data.firstSunday) flags.push(' 🆕 First Sunday')
  if (data.prayerRequest && data.prayerRequest.trim()) flags.push(' 🙏 Prayer Request')
  return `Connect Card — ${campusLabel(data.campus)} — ${data.firstName} ${data.lastName}${flags.join('')}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeHtmlMultiline(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>\n')
}

// Matches Bill's existing inbox convention (see ConnectCardSample.png):
// <b>Field Label</b><br>Value<br><br> per field, omitted entirely when empty.
function field(label: string, valueHtml: string): string {
  return `<b>${label}</b><br>\n${valueHtml}<br>\n<br>\n`
}

function buildHtmlBody(data: ConnectCardPayload): string {
  const parts: string[] = []

  parts.push(field('Where did you attend with us?', `${campusLabel(data.campus)} Campus`))
  parts.push(field('First Name', escapeHtml(data.firstName)))
  parts.push(field('Last Name', escapeHtml(data.lastName)))
  parts.push(field('Email', `<a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a>`))

  if (data.phone && data.phone.trim()) {
    parts.push(field('Phone Number', escapeHtml(data.phone)))
  }

  if (data.comment && data.comment.trim()) {
    parts.push(field('Do you have a question/comment?', escapeHtmlMultiline(data.comment)))
  }

  if (data.nextSteps.length > 0) {
    const stepsHtml = data.nextSteps.map(step => escapeHtml(step)).join('<br>\n')
    parts.push(field('Are you ready to take a Next Step this week?', stepsHtml))
  }

  if (data.firstSunday) {
    parts.push(field('Is this your first Sunday with us?', 'Yes'))
    if (data.howHeard && data.howHeard.trim()) {
      parts.push(field('Please share who/how you heard about Catalyst', escapeHtmlMultiline(data.howHeard)))
    }
  }

  if (data.restrictToLeadership) {
    parts.push(field('Restrict to leadership only', 'Yes'))
  }

  if (data.prayerRequest && data.prayerRequest.trim()) {
    parts.push(field('How can we pray for you this week?', escapeHtmlMultiline(data.prayerRequest)))
  }

  return parts.join('')
}

export async function POST(req: NextRequest) {
  // This route is directly POST-able by anyone who knows the URL — the
  // page's requireLiveTool() check does NOT protect it. Gate it here too,
  // before touching the payload or Brevo, or a 'draft' tool's endpoint
  // stays live and abusable regardless of what the page shows.
  if (!(await isToolLive('cat', 'connect'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const data = await req.json().catch(() => null)
  if (!data) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const campus = (data.campus ?? '').trim()
  const firstName = (data.firstName ?? '').trim()
  const lastName = (data.lastName ?? '').trim()
  const email = (data.email ?? '').trim()

  if (campus !== 'wilmington' && campus !== 'online') {
    return NextResponse.json({ error: 'Please select a campus.' }, { status: 400 })
  }
  if (!firstName) return NextResponse.json({ error: 'First name is required.' }, { status: 400 })
  if (!lastName) return NextResponse.json({ error: 'Last name is required.' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }

  const phoneDigits = normalizePhoneDigits((data.phone ?? '').trim())
  if (phoneDigits && BLOCKED_PHONE_DIGITS.has(phoneDigits)) {
    console.warn(`[cat/connect] Blocked submission from known spam phone number: ${phoneDigits}`)
    return NextResponse.json({ ok: true })
  }

  const payload: ConnectCardPayload = {
    campus,
    firstName,
    lastName,
    email,
    phone: (data.phone ?? '').trim() || null,
    comment: (data.comment ?? '').trim() || null,
    nextSteps: Array.isArray(data.nextSteps) ? data.nextSteps.filter((s: unknown) => typeof s === 'string') : [],
    firstSunday: Boolean(data.firstSunday),
    howHeard: (data.howHeard ?? '').trim() || null,
    restrictToLeadership: Boolean(data.restrictToLeadership),
    prayerRequest: (data.prayerRequest ?? '').trim() || null,
  }

  const toRecipients = [
    { email: process.env.CONNECT_CARD_TO_BILL, name: 'Bill' },
    { email: process.env.CONNECT_CARD_TO_DONNA, name: 'Donna' },
    { email: process.env.CONNECT_CARD_TO_TYLER, name: 'Tyler' },
  ].filter((r): r is { email: string; name: string } => Boolean(r.email))

  if (toRecipients.length === 0) {
    console.error('[cat/connect] No recipient env vars configured (CONNECT_CARD_TO_BILL/DONNA/TYLER) — submission accepted but not emailed.')
  } else {
    try {
      const brevoRes = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': process.env.BREVO_API_KEY_CONNECT_CARD ?? '',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: SENDER_EMAIL, name: SENDER_NAME },
          to: toRecipients,
          // Brevo rejects a recipient object with a missing/empty "name" the same
          // as a missing key ("name is missing in to") — every entry here (to and
          // bcc) must always carry a non-empty name.
          ...(process.env.CONNECT_CARD_BCC
            ? { bcc: [{ email: process.env.CONNECT_CARD_BCC, name: 'Watson Intake' }] }
            : {}),
          subject: buildSubject(payload),
          htmlContent: buildHtmlBody(payload),
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (!brevoRes.ok) {
        const errText = await brevoRes.text().catch(() => '')
        console.error(`[cat/connect] Brevo API ${brevoRes.status}: ${errText}`)
      }
    } catch (err) {
      console.error('[cat/connect] Brevo send failed (non-fatal, submission still accepted):', err)
    }
  }

  return NextResponse.json({ ok: true })
}
