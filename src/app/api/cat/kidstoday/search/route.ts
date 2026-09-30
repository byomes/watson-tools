import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import { requirePin } from '@/lib/requirePin'
import path from 'path'

export async function GET(req: NextRequest) {
  await requirePin(req)

  const q = req.nextUrl.searchParams.get('q') || ''
  if (!q.trim()) {
    return NextResponse.json({ results: [] })
  }

  const congregationPath = path.join(process.env.HOME || '/home/billyomes', 'watson', 'data', 'congregation.db')
  const watsonPath = path.join(process.env.HOME || '/home/billyomes', 'watson', 'data', 'watson.db')

  const congregationDb = new Database(congregationPath, { readonly: true })
  const watsonDb = new Database(watsonPath, { readonly: true })

  try {
    const members = congregationDb
      .prepare(
        `SELECT id as member_id, name
         FROM members
         WHERE active NOT IN ('disconnected', 'deceased')
         AND name NOT LIKE '%CAMPUS%'
         AND name NOT LIKE '%SYSTEM%'
         AND name NOT LIKE '%TEST%'
         AND name LIKE ?
         ORDER BY name
         LIMIT 20`
      )
      .all(`%${q}%`)

    const results = (members as any[]).map(m => {
      const person = watsonDb
        .prepare('SELECT id as person_id, phone FROM people WHERE member_id = ?')
        .get(m.member_id)
      return {
        name: m.name,
        member_id: m.member_id,
        person_id: person?.person_id || 0,
      }
    })

    return NextResponse.json({ results })
  } finally {
    congregationDb.close()
    watsonDb.close()
  }
}
