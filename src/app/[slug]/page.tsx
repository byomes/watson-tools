import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { watsonFetch } from '@/lib/watson';

interface Tool {
  slug: string;
  title: string;
  tool_type: 'redirect' | 'page' | 'custom';
  target_url: string | null;
  body_text: string | null;
}

// Only ever returns a tool whose status is 'live' — jobs/tools/api.py's
// /api/tools/resolve/<slug> hides draft rows entirely, so a tool mid-build
// is invisible here even if its slug is already known. Going live is a
// separate, explicit step (see jobs/tools/registry.py's first-deploy
// Telegram confirm gate).
async function getTool(slug: string): Promise<Tool | null> {
  const res = await watsonFetch(`/api/tools/resolve/${encodeURIComponent(slug)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getTool(slug);
  if (!tool) return { title: 'Not Found' };
  return { title: tool.title };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = await getTool(slug);

  if (!tool) notFound();

  if (tool.tool_type === 'redirect') {
    if (!tool.target_url) notFound();
    redirect(tool.target_url);
  }

  if (tool.tool_type === 'page') {
    const paragraphs = (tool.body_text ?? '').split(/\n{2,}/).filter(Boolean);
    return (
      <div className="min-h-screen bg-white py-16 px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-semibold mb-6">{tool.title}</h1>
          {paragraphs.map((p, i) => (
            <p key={i} className="mb-4 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </div>
    );
  }

  // 'custom' tools are served by their own dedicated route, which Next.js
  // matches ahead of this catch-all — reaching here for a 'custom' row
  // means no such route has been built yet.
  notFound();
}
