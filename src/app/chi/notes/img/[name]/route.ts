import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { isLoggedIn } from '@/lib/chiunitedAuth'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  if (!(await isLoggedIn())) return new Response('Unauthorized', { status: 401 })
  const { name } = await ctx.params
  if (!/^[a-z0-9-]+$/.test(name)) return new Response('Not found', { status: 404 })
  try {
    const data = await readFile(join(homedir(), 'sound-consult', 'site', 'img', `${name}.jpg`))
    return new Response(new Uint8Array(data), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
