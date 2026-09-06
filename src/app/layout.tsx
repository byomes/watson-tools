import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Watson Public Tools',
  description: 'Public-facing tools built and maintained by Watson.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-white dark:bg-gray-950">
      <body className="antialiased bg-white dark:bg-gray-950">{children}</body>
    </html>
  );
}
