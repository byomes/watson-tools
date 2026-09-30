import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import { requirePin } from '@/lib/requirePin'
import path from 'path'
import { format } from 'date-fns'

const dbPath = path.join(process.env.HOME || '/home/billyomes', 'watson', 'data', 'congregation.db')

export async function GET(req: NextRequest) {
  await requirePin(req)

  const db = new Database(dbPath, { readonly: true })
  const today = format(new Date(), 'yyyy-MM-dd')

  try {
    const overrides = db
      .prepare('SELECT class_name, member_id, person_id FROM kids_servant_overrides WHERE event_date = ?')
      .all(today)

    const defaults: Record<string, any> = {
      Nursery: { name: 'Tara Mathena', member_id: 236, person_id: 450 },
      'Pre-K': { name: 'Tara Mathena', member_id: 236, person_id: 450 },
      Elementary: { name: 'Lucie Hale', member_id: 102, person_id: 332 },
    }

    const servants = { ...defaults }
    for (const override of overrides) {
      const member = db
        .prepare('SELECT id, name FROM members WHERE id = ?')
        .get(override.member_id)
      if (member) {
        servants[override.class_name] = {
          name: member.name,
          member_id: override.member_id,
          person_id: override.person_id,
        }
      }
    }

    return NextResponse.json({ servants })
  } finally {
    db.close()
  }
}

export async function POST(req: NextRequest) {
  await requirePin(req)

  const { servants } = await req.json()
  const today = format(new Date(), 'yyyy-MM-dd')

  const db = new Database(dbPath)

  try {
    db.exec('BEGIN TRANSACTION')

    // Delete existing overrides for today
    db.prepare('DELETE FROM kids_servant_overrides WHERE event_date = ?').run(today)

    // Insert new overrides (only if they differ from defaults)
    const defaults: Record<string, any> = {
      Nursery: { member_id: 236, person_id: 450 },
      'Pre-K': { member_id: 236, person_id: 450 },
      Elementary: { member_id: 102, person_id: 332 },
    }

    const stmt = db.prepare(
      'INSERT INTO kids_servant_overrides (event_date, class_name, member_id, person_id) VALUES (?, ?, ?, ?)'
    )

    for (const [className, servant] of Object.entries(servants)) {
      const def = defaults[className]
      if (
        def &&
        (servant.member_id !== def.member_id || servant.person_id !== def.person_id)
      ) {
        stmt.run(today, className, servant.member_id, servant.person_id)
      }
    }

    db.exec('COMMIT')
    return NextResponse.json({ success: true })
  } catch (e) {
    db.exec('ROLLBACK')
    console.error('Failed to save overrides:', e)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  } finally {
    db.close()
  }
}
