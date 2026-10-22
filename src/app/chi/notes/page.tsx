import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { isLoggedIn } from '@/lib/chiunitedAuth'

// ChiUnited consult working notes (2026-10-22). The page body is a private HTML file on the
// Beelink (~/sound-consult/site/notes.html), so no church details live in git. Same PIN session as /chiunited.

export const metadata: Metadata = {
  title: 'ChiUnited tech notes',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function ChiNotesPage() {
  if (!(await isLoggedIn())) redirect('/chiunited/login?next=/chi/notes')

  let html: string
  try {
    html = await readFile(join(homedir(), 'sound-consult', 'site', 'notes.html'), 'utf8')
  } catch {
    return <p className="p-8 text-gray-700 dark:text-gray-300">Notes are not available on this server.</p>
  }
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
