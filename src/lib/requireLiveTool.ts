import { notFound } from 'next/navigation';
import { watsonFetch } from '@/lib/watson';

// Every 'custom'-type tool (its own dedicated route file, not the
// [category]/[slug] catch-all) MUST gate itself using one of the two
// functions below — a static route file never otherwise consults the
// public_tools go-live gate on its own; the catch-all only gates
// redirect/page types for free because it fetches the row live at request
// time. This applies to BOTH the page component AND any API route it
// posts to — a page-only check (requireLiveTool) does not protect its own
// API route, which remains directly POST-able by anyone who knows the URL
// regardless of draft status unless it checks isToolLive() itself too.
export async function isToolLive(category: string, slug: string): Promise<boolean> {
  try {
    const res = await watsonFetch(
      `/api/tools/resolve/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`,
    );
    return res.ok;
  } catch {
    // Fail closed — if the resolve check itself can't be made (e.g.
    // WATSON_API_URL missing), treat the tool as not live rather than
    // silently letting it through.
    return false;
  }
}

// Page usage: calls notFound() itself if the tool isn't 'live'; a caller
// just awaits it as the page's first line.
export async function requireLiveTool(category: string, slug: string): Promise<void> {
  if (!(await isToolLive(category, slug))) notFound();
}
