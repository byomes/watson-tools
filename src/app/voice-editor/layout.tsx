import type { Metadata } from 'next'

export const metadata: Metadata = {
  // Not capable: true. iOS standalone (Home Screen) mode has no SpeechRecognition,
  // so the Speak button's mic never opens; the shortcut must open in Safari.
  appleWebApp: { capable: false, title: 'Voice Editor' },
  icons: {
    icon: [
      { url: '/voice-editor-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/voice-editor-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    // iOS's "Add to Home Screen" reads this tag directly.
    apple: [{ url: '/voice-editor-apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function VoiceEditorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
