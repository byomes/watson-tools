import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import { requirePin } from '@/lib/requirePin'
import path from 'path'

const dbPath = path.join(process.env.HOME || '/home/billyomes', 'watson', 'data', 'congregation.db')

export async function GET(req: NextRequest) {
  await requirePin(req)

  const q = req.nextUrl.searchParams.get('q') || ''
  if (!q.trim()) {
    return NextResponse.json({ results: [] })
  }

  const db = new Database(dbPath, { readonly: true })

  try {
    const results = db
      .prepare(
        `SELECT DISTINCT m.id as member_id, m.name, p.id as person_id
         FROM members m
         LEFT JOIN watson_people p ON p.member_id = m.id
         WHERE m.active NOT IN ('disconnected', 'deceased')
         AND m.name NOT LIKE '%CAMPUS%'
         AND m.name NOT LIKE '%SYSTEM%'
         AND m.name NOT LIKE '%TEST%'
         AND (m.name LIKE ? OR p.phone LIKE ?)
         ORDER BY m.name
         LIMIT 20`
      )
      .all(`%${q}%`, `%${q}%`)

    const mapped = results.map((r: any) => ({
      name: r.name,
      member_id: r.member_id,
      person_id: r.person_id || 0,
    }))

    return NextResponse.json({ results: mapped })
  } finally {
    db.close()
  }
}
