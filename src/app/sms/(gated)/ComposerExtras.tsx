import { schedulePreset, smsSegments, templateQuery } from './composerExtras'

type Colors = { line: string; ink: string; inkSoft: string; tagblueSoft: string; moss: string }
type Template = { id: string; label: string; body: string; updated_at: string }

export function SegmentCounter({ body, color }: { body: string; color: string }) {
  if (!body) return null
  const count = smsSegments(body)
  return <div className="text-right text-xs" style={{ color }} aria-label="SMS character and segment count">
    {count.characters} characters · {count.segments} {count.segments === 1 ? 'segment' : 'segments'} · {count.encoding}
  </div>
}

export function TemplatePicker({ body, open, templates, colors, onPick }: {
  body: string; open: boolean; templates: Template[]; colors: Colors; onPick: (template: Template) => void
}) {
  const query = templateQuery(body)
  if (!open && query === null) return null
  const matches = query === null ? templates : templates.filter((template) => template.label.toLowerCase().includes(query))
  return <div className="flex flex-col gap-1 rounded-lg border p-2 max-h-40 overflow-y-auto" style={{ borderColor: colors.line }} aria-label="Saved templates">
    {matches.length ? matches.map((template) => <button
      key={template.id} type="button" onClick={() => onPick(template)}
      className="text-left text-xs px-2 py-1.5 rounded-md font-medium"
      style={{ background: colors.tagblueSoft, color: colors.ink }}
    >{template.label}</button>) : <span className="text-xs px-2" style={{ color: colors.inkSoft }}>No matching templates</span>}
  </div>
}

export function SchedulePresets({ onSelect, onPickTime, colors }: {
  onSelect: (value: string) => void; onPickTime: () => void; colors: Colors
}) {
  return <div className="flex flex-wrap gap-2">
    <button type="button" onClick={() => onSelect(schedulePreset('tonight'))} className="text-xs rounded-full border px-2.5 py-1" style={{ borderColor: colors.moss, color: colors.moss }}>Tonight 7pm</button>
    <button type="button" onClick={() => onSelect(schedulePreset('tomorrow'))} className="text-xs rounded-full border px-2.5 py-1" style={{ borderColor: colors.moss, color: colors.moss }}>Tomorrow 8am</button>
    <button type="button" onClick={onPickTime} className="text-xs rounded-full border px-2.5 py-1" style={{ borderColor: colors.moss, color: colors.moss }}>Pick time</button>
  </div>
}
