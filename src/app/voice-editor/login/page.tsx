import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/voiceEditorAuth'
import PinPad from './pin-pad'
import { ThemeToggle } from '../theme'

export const metadata: Metadata = {
  title: 'Voice Editor',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function VoiceEditorLoginPage() {
  if (await isLoggedIn()) redirect('/voice-editor')

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-8">
      <ThemeToggle className="absolute top-4 right-4 rounded-lg px-3 py-2 text-sm bg-gray-200 dark:bg-gray-800" />
      <div className="w-full max-w-xs">
        <h1 className="text-xl font-bold text-black dark:text-white text-center mb-1">
          Voice Editor
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">Enter the PIN</p>
        <PinPad />
      </div>
    </div>
  )
}
