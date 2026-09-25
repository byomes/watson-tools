import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Watson Public Tools',
  description: 'Public-facing tools built and maintained by Watson.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the deacon app (see ThemeInitScript.tsx)
    // injects a synchronous pre-paint script that can add `.dark` to this
    // element before React hydrates, so React's own hydration check would
    // otherwise flag a className mismatch here even though it's expected.
    <html lang="en" className="bg-white dark:bg-gray-950" suppressHydrationWarning>
      <body className="antialiased bg-white dark:bg-gray-950">{children}</body>
    </html>
  );
}
