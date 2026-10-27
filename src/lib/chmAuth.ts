import { getSession } from '@/lib/catalystdbAuth'
import { getElderSession } from '@/lib/chmElderAuth'

// Who is using the dashboard and what they may see. Today the only logins are the two
// catalystdb_pins people (Bill and Donna), who are full admins. Elders and deacons get
// their own PIN source later; the Watson side already enforces every role, so adding a
// role here is the only change the web app needs.
export type ChmRole = 'admin' | 'elder' | 'deacon'

export async function chmIdentity(): Promise<{ user: string; role: ChmRole } | null> {
  const admin = await getSession()
  if (admin) return { user: admin, role: 'admin' }
  const elder = await getElderSession()
  if (elder) return { user: elder, role: 'elder' }
  return null
}
