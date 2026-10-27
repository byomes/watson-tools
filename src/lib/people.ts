// DEFAULT ORDER FOR EVERY LIST OF PEOPLE (Bill, 2026-10-27): last name, then household, then first name.
// Last name = final word of the name. Keeping the household second keeps a family together.
// Any new list of people must sort with these helpers unless the user asks for a different order.

type Person = { name?: unknown; household_id?: unknown }

export function lastNameKey(name: unknown): string {
  const s = String(name ?? '').trim()
  const parts = s.split(/\s+/)
  return (parts.length > 1 ? parts[parts.length - 1] : s).toLowerCase()
}

export function compareByLastName(a: { name: string; household?: unknown }, b: { name: string; household?: unknown }): number {
  return (
    lastNameKey(a.name).localeCompare(lastNameKey(b.name)) ||
    String(a.household ?? '').localeCompare(String(b.household ?? '')) ||
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  )
}

export function byLastName<T extends Person>(a: T, b: T): number {
  return compareByLastName({ name: String(a.name ?? ''), household: a.household_id }, { name: String(b.name ?? ''), household: b.household_id })
}

export function sortByLastName<T extends Person>(rows: T[] | undefined | null): T[] {
  return [...(rows ?? [])].sort(byLastName)
}

// Kids come as first_name / last_name.
export function sortKidsByLastName<T extends { first_name?: unknown; last_name?: unknown; household_id?: unknown }>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    compareByLastName({ name: `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim(), household: a.household_id }, { name: `${b.first_name ?? ''} ${b.last_name ?? ''}`.trim(), household: b.household_id }))
}
