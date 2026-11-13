export type Skill = { id: string; name: string; description: string }

export type SlashAction = { id: string; label: string; description: string }

export const slashActions: SlashAction[] = [
  { id: 'new', label: 'New chat', description: 'Start a new conversation' },
  { id: 'web', label: 'Web search', description: 'Toggle web search for the next turn' },
  { id: 'thinking', label: 'Extended thinking', description: 'Toggle extended thinking for the next turn' },
]

export function slashQuery(value: string): string | null {
  return /^\/\S*$/.test(value) ? value.slice(1).toLowerCase() : null
}

export function slashChoices(value: string, skills: Skill[]) {
  const query = slashQuery(value)
  if (query === null) return []
  return [
    ...slashActions.filter(action => `${action.label} ${action.description}`.toLowerCase().includes(query)).map(action => ({ ...action, kind: 'action' as const })),
    ...skills.filter(skill => `${skill.id} ${skill.name} ${skill.description}`.toLowerCase().includes(query)).map(skill => ({ ...skill, label: skill.name, kind: 'skill' as const })),
  ]
}

export function draftKey(chatId: string) { return `watson-draft-${chatId}` }

export function readDraft(storage: Pick<Storage, 'getItem'>, chatId: string) {
  try { return storage.getItem(draftKey(chatId)) || '' } catch { return '' }
}

export function writeDraft(storage: Pick<Storage, 'setItem' | 'removeItem'>, chatId: string, value: string) {
  try {
    if (value) storage.setItem(draftKey(chatId), value)
    else storage.removeItem(draftKey(chatId))
  } catch { /* Storage can be unavailable or full. */ }
}
