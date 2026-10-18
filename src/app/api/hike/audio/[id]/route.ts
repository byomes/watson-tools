import { NextResponse } from 'next/server'
import { watsonFetch } from '@/lib/watson'

// Public on purpose: this is the link texted to family. The 128-bit random
// id is the only access control, same idea as an unlisted share link.
// Range support is required -- iPhone Safari will not play a bare media
// URL that ignores Range requests.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f]{32}$/.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const res = await watsonFetch(`/api/sms/hike-audio/${id}`, {
    headers: { 'X-Watson-Key': process.env.SMS_APP_API_KEY ?? '' },
  })
  if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const buf = Buffer.from(await res.arrayBuffer())
  const base = { 'Content-Type': 'audio/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600' }

  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '')
  if (m && (m[1] || m[2])) {
    const total = buf.length
    let start = m[1] ? Number(m[1]) : Math.max(0, total - Number(m[2]))
    let end = m[1] && m[2] ? Number(m[2]) : total - 1
    end = Math.min(end, total - 1)
    if (start > end || start >= total) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } })
    }
    start = Math.max(0, start)
    return new Response(buf.subarray(start, end + 1), {
      status: 206,
      headers: { ...base, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': String(end - start + 1) },
    })
  }
  return new Response(buf, { headers: { ...base, 'Content-Length': String(buf.length) } })
}
