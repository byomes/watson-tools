const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
const GSM_EXTENDED = '^{}\\[~]|€\f'

export function smsSegments(body: string) {
  const gsm = [...body].every((char) => GSM_BASIC.includes(char) || GSM_EXTENDED.includes(char))
  const characters = gsm
    ? [...body].reduce((count, char) => count + (GSM_EXTENDED.includes(char) ? 2 : 1), 0)
    : body.length
  const singleLimit = gsm ? 160 : 70
  const multiLimit = gsm ? 153 : 67
  const segments = characters === 0 ? 0 : characters <= singleLimit ? 1 : Math.ceil(characters / multiLimit)
  return { encoding: gsm ? 'GSM-7' : 'UCS-2', characters, segments }
}

export function templateQuery(body: string): string | null {
  return body.startsWith('/') && !body.includes('\n') ? body.slice(1).trim().toLowerCase() : null
}

export function schedulePreset(preset: 'tonight' | 'tomorrow', now = new Date()): string {
  const date = new Date(now)
  date.setHours(preset === 'tonight' ? 19 : 8, 0, 0, 0)
  if (preset === 'tomorrow' || date <= now) date.setDate(date.getDate() + 1)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
