import { getSession } from '@/lib/catalystdbAuth'

// Who is using the dashboard and what they may see. Today the only logins are the two
// catalystdb_pins people (Bill and Donna), who are full admins. Elders and deacons get
// their own PIN source later; the Watson side already enforces every role, so adding a
// role here is the only change the web app needs.
export type ChmRole = 'admin' | 'elder' | 'deacon'

export async function chmIdentity(): Promise<{ user: string; role: ChmRole } | null> {
  const user = await getSession()
  if (!user) return null
  return { user, role: 'admin' }
}
