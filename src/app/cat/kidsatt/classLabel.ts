// Display-only names for kids classes. The stored class_name stays the key (it matches the
// Subsplash check-in data and the attendance history), so only what leaders read changes.
const LABELS: Record<string, string> = {
  Nursery: '10 AM Nursery',
  'Pre-K': '10 AM Toddler/Pre-K',
  'Elementary Kids Church': '10 AM Elementary Kids Church',
}

export function classLabel(name: string): string {
  return LABELS[name] ?? name
}
