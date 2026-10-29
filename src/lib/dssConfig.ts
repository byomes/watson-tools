// Single place for the names and labels that belong to one church. Set NEXT_PUBLIC_DSS_NAME (and friends) in the environment
// to rebrand the DSS; the church defaults below are Catalyst's; the product name is 9e9 Digital Shepherding, so nothing changes until a value is set.
export const DSS_CHURCH = process.env.NEXT_PUBLIC_DSS_CHURCH ?? 'Catalyst'
export const DSS_NAME = process.env.NEXT_PUBLIC_DSS_NAME ?? '9e9 Digital Shepherding'
export const DSS_TAGLINE = process.env.NEXT_PUBLIC_DSS_TAGLINE ?? 'Know Every One.'

// The church's word for the people who care for others ("Shepherd" by default; set NEXT_PUBLIC_DSS_SHEPHERD_TERM to change it,
// for example Elder or Care Partner). shep() swaps the word in a label, keeping case and a/an agreement. Same rule as the 9e9 app.
export const DSS_SHEPHERD = process.env.NEXT_PUBLIC_DSS_SHEPHERD_TERM ?? 'Shepherd'
export function pluralTerm(term: string): string {
  return /[^aeiou]y$/i.test(term) ? term.slice(0, -1) + 'ies' : term + 's'
}
export function shep(text: string): string {
  const term = DSS_SHEPHERD
  if (!text || term === 'Shepherd') return text
  const pl = pluralTerm(term)
  const art = /^[aeiou]/i.test(term) ? 'an' : 'a'
  return text
    .replace(/\b([Aa]n?) ([Ss]hepherd)\b/g, (_m, a: string, w: string) => `${a[0] === 'A' ? art[0].toUpperCase() + art.slice(1) : art} ${w[0] === 'S' ? term : term.toLowerCase()}`)
    .replace(/\bShepherds\b/g, pl)
    .replace(/\bshepherds\b/g, pl.toLowerCase())
    .replace(/\bShepherd\b/g, term)
    .replace(/\bshepherd\b/g, term.toLowerCase())
}
