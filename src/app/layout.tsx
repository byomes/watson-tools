import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Watson Public Tools',
  description: 'Public-facing tools built and maintained by Watson.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
