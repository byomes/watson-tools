// Shared DSS rules, mirrored from jobs/congregation/deacon_rules.py so the deacon app and the dashboard agree.

/** Unassigned is '--' in the database; NULL and '' mean the same thing. */
export function isUnassigned(deacon: string | null | undefined): boolean {
  const v = (deacon ?? '').trim()
  return v === '' || v === '--' || v.toLowerCase() === 'none'
}

/** Whole years old today, or null without a usable birthdate. */
export function ageOf(birthdate: string | null | undefined): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((birthdate ?? '').trim())
  if (!m) return null
  const now = new Date()
  let age = now.getFullYear() - Number(m[1])
  if (now.getMonth() + 1 < Number(m[2]) || (now.getMonth() + 1 === Number(m[2]) && now.getDate() < Number(m[3]))) age -= 1
  return age
}

/** Under 18 by birthdate (never by household role). No birthdate = unknown = not a minor. Minors ride with their household's deacon. */
export function isMinor(birthdate: string | null | undefined): boolean {
  const a = ageOf(birthdate)
  return a !== null && a < 18
}
