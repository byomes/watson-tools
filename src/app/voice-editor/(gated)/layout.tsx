import { redirect } from 'next/navigation'
import { isLoggedIn } from '@/lib/voiceEditorAuth'

export default async function VoiceEditorGatedLayout({ children }: { children: React.ReactNode }) {
  if (!(await isLoggedIn())) redirect('/voice-editor/login')
  return <>{children}</>
}
