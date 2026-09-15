'use client'

import { useEffect, useState } from 'react'

type Platform = 'facebook' | 'instagram' | 'both'
type PostStatus = 'approved' | 'processing' | 'posted' | 'failed' | 'cancelled'

interface QueuedPost {
  id: number
  platform: Platform
  text: string
  image_path: string | null
  video_path: string | null
  status: PostStatus
  scheduled_time: string
  posted_time: string | null
  fb_error: string | null
  ig_error: string | null
  created_at: string
}

interface Clip {
  id: number
  video_name: string
  serve_token: string
  pulled_at: string
}

// Tailscale Funnel public host — the browser fetches clip video bytes
// directly from here rather than through the Vercel proxy (files run
// into the hundreds of MB), same pattern as ServantCareSearch.tsx's
// PHOTO_BASE.
const CLIP_BASE = 'https://watson.tail0243ff.ts.net'

interface Status {
  configured: boolean
  valid?: boolean
  days_remaining?: number | null
  ig_configured?: boolean
  error?: string
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function StatusBanner({ status }: { status: Status | null }) {
  if (!status) return null

  if (!status.configured) {
    return (
      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
        Not connected yet — Meta app/token setup for the church&apos;s Facebook Page and Instagram account is still
        pending. Posts can be queued below but won&apos;t go out until that&apos;s done.
      </div>
    )
  }
  if (status.valid === false) {
    return (
      <div className="mb-6 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
        ⚠️ The connected token is expired or invalid. Posts will not go out until it&apos;s renewed.
      </div>
    )
  }
  if (typeof status.days_remaining === 'number' && status.days_remaining <= 7) {
    return (
      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
        ⚠️ Token expires in {status.days_remaining} day{status.days_remaining === 1 ? '' : 's'} — renew soon.
      </div>
    )
  }
  return (
    <div className="mb-6 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-800 px-4 py-3 text-sm text-green-800 dark:text-green-200">
      ✅ Connected{!status.ig_configured ? ' (Facebook only — Instagram not yet configured)' : ''}.
    </div>
  )
}

function ComposeForm({
  onCreated,
  clip,
  onClearClip,
}: {
  onCreated: () => void
  clip: Clip | null
  onClearClip: () => void
}) {
  const [platform, setPlatform] = useState<Platform>('facebook')
  const [text, setText] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsImage = platform !== 'facebook' && !clip

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (needsImage && !image) {
      setError('Instagram requires an image.')
      return
    }

    setSubmitting(true)
    try {
      const image_base64 = !clip && image ? await fileToBase64(image) : undefined
      const res = await fetch('/api/cat/social/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          text,
          scheduled_time: scheduledTime,
          image_base64,
          clip_id: clip?.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not queue post.')
        return
      }
      setText('')
      setScheduledTime('')
      setImage(null)
      onClearClip()
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="mb-10 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-black dark:text-white mb-3">
        {clip ? 'Schedule clip' : 'Queue a post'}
      </h2>

      {clip && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2">
          <p className="text-sm text-black dark:text-white truncate">🎬 {clip.video_name}</p>
          <button
            type="button"
            onClick={onClearClip}
            className="shrink-0 text-xs text-gray-600 dark:text-gray-400 underline"
          >
            Use a different post instead
          </button>
        </div>
      )}

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
      <select
        value={platform}
        onChange={(e) => setPlatform(e.target.value as Platform)}
        className="w-full mb-3 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-800"
      >
        <option value="facebook">Facebook</option>
        <option value="instagram">Instagram</option>
        <option value="both">Both</option>
      </select>

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {clip ? 'Caption' : 'Post text'}
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
        rows={4}
        className="w-full mb-3 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-800"
      />

      {!clip && (
        <>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Image{needsImage ? ' (required for Instagram)' : ' (optional)'}
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            className="w-full mb-3 text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-200 dark:file:bg-gray-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-black dark:file:text-white hover:file:bg-gray-300 dark:hover:file:bg-gray-600"
          />
        </>
      )}

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Scheduled time</label>
      <input
        type="datetime-local"
        value={scheduledTime}
        onChange={(e) => setScheduledTime(e.target.value)}
        required
        className="w-full mb-4 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-black dark:text-white bg-white dark:bg-gray-800"
      />

      {error && <p className="text-red-600 dark:text-red-400 text-sm mb-3">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg px-4 py-2 text-sm font-medium bg-black text-white dark:bg-white dark:text-black disabled:opacity-50"
      >
        {submitting ? 'Queuing…' : clip ? 'Schedule clip' : 'Queue post'}
      </button>
    </form>
  )
}

function ClipList({ clips, onSchedule }: { clips: Clip[]; onSchedule: (clip: Clip) => void }) {
  if (clips.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">No Sermon Shots clips awaiting review.</p>
  }

  return (
    <div className="mb-10">
      <h2 className="text-lg font-semibold text-black dark:text-white mb-3">Sermon Clips</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clips.map((c) => (
          <div key={c.id} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <video controls preload="metadata" className="w-full bg-black" style={{ aspectRatio: '9 / 16' }}>
              <source src={`${CLIP_BASE}/church_social/clip/${c.serve_token}`} type="video/mp4" />
            </video>
            <div className="p-3">
              <p className="text-sm text-black dark:text-white truncate" title={c.video_name}>
                {c.video_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Pulled {c.pulled_at}</p>
              <button
                type="button"
                onClick={() => onSchedule(c)}
                className="w-full rounded-lg px-3 py-1.5 text-sm font-medium bg-black text-white dark:bg-white dark:text-black"
              >
                Schedule…
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const STATUS_ICON: Record<PostStatus, string> = {
  approved: '📅',
  processing: '⏳',
  posted: '✅',
  failed: '⚠️',
  cancelled: '❌',
}

function QueueList({ posts, onCancel }: { posts: QueuedPost[]; onCancel: (id: number) => void }) {
  if (posts.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No posts queued yet.</p>
  }

  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-800 border-y border-gray-200 dark:border-gray-800">
      {posts.map((p) => (
        <li key={p.id} className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-black dark:text-white">
                {STATUS_ICON[p.status]} <span className="font-medium capitalize">{p.platform}</span>
                {p.video_path ? ' 🎬' : ''} —{' '}
                {p.status === 'posted' ? p.posted_time : p.scheduled_time}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap break-words">{p.text}</p>
              {p.status === 'processing' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Instagram is still processing this video — it&apos;ll publish automatically once ready.
                </p>
              )}
              {p.status === 'failed' && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {p.fb_error && `FB: ${p.fb_error}`} {p.ig_error && `IG: ${p.ig_error}`}
                </p>
              )}
            </div>
            {p.status === 'approved' && (
              <button
                type="button"
                onClick={() => onCancel(p.id)}
                className="shrink-0 text-xs text-red-600 dark:text-red-400 underline"
              >
                Cancel
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function SocialDashboard() {
  const [status, setStatus] = useState<Status | null>(null)
  const [posts, setPosts] = useState<QueuedPost[]>([])
  const [clips, setClips] = useState<Clip[]>([])
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    const [statusRes, queueRes, clipsRes] = await Promise.all([
      fetch('/api/cat/social/status'),
      fetch('/api/cat/social/queue'),
      fetch('/api/cat/social/clips'),
    ])
    if (!statusRes.ok || !queueRes.ok || !clipsRes.ok) {
      setError('Could not load the dashboard. Try refreshing.')
      return
    }
    setStatus(await statusRes.json())
    setPosts((await queueRes.json()).posts ?? [])
    setClips((await clipsRes.json()).clips ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  const handleCancel = async (id: number) => {
    const res = await fetch('/api/cat/social/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      setError('Could not cancel that post.')
      return
    }
    await load()
  }

  return (
    <div>
      <StatusBanner status={status} />
      <ClipList clips={clips} onSchedule={setSelectedClip} />
      <ComposeForm onCreated={load} clip={selectedClip} onClearClip={() => setSelectedClip(null)} />
      {error && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}
      <h2 className="text-lg font-semibold text-black dark:text-white mb-2">Queue</h2>
      <QueueList posts={posts} onCancel={handleCancel} />
    </div>
  )
}
