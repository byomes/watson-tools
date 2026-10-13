import type { NextRequest } from 'next/server'

// A per-group attendance link (wtsn.me/cat/group?t=...) sends its token in this header; the Watson
// backend limits the request to that one group. Absent for the shared leader link.
export function groupTokenHeader(req: NextRequest): Record<string, string> {
  const t = req.headers.get('x-group-token')
  return t ? { 'X-Group-Token': t } : {}
}
