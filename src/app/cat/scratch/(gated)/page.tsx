import type { Metadata } from 'next'
import { logoutAction } from '../actions'

export const metadata: Metadata = {
  title: 'Scratch',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function ScratchIndexPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 py-16 px-8">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-black dark:text-white">Scratch</h1>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-gray-500 dark:text-gray-400 underline">
              Log out
            </button>
          </form>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No scratch pages right now. When Watson builds a draft for review,
          it&apos;ll link it directly (e.g. wtsn.me/cat/scratch/&lt;name&gt;) --
          this index doesn&apos;t list them.
        </p>
      </div>
    </div>
  )
}
