import { notFound } from 'next/navigation';
import { watsonFetch } from '@/lib/watson';

// Every 'custom'-type tool (its own dedicated route file, not the
// [category]/[slug] catch-all) MUST call this before rendering anything —
// a static route file never otherwise consults the public_tools go-live
// gate on its own; the catch-all only gates redirect/page types for free
// because it fetches the row live at request time. Calls notFound() itself
// if the tool isn't 'live'; a caller just awaits it as the page's first line.
export async function requireLiveTool(category: string, slug: string): Promise<void> {
  const res = await watsonFetch(
    `/api/tools/resolve/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`,
  );
  if (!res.ok) notFound();
}
