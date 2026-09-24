// Single source of truth for every editable members column -- drives the
// table, the inline cell editor, the filter bar, and the bulk-edit field
// picker in CatalystDBBoard.tsx. Keeping this as data (not per-column JSX)
// is what lets one grid component handle all 25 fields.
export type ColType = 'text' | 'select' | 'date' | 'bool'

export interface Col {
  key: string
  label: string
  type: ColType
  options?: string[]
  defaultVisible?: boolean
  readOnly?: boolean
}

// Real, individually-addressable deacon names, mirrored from
// jobs.congregation.deacon_reports.list_deacons() (Python) as of 2026-09-24 --
// plus the two deliberate non-name bucket values ('Elders & Deacons',
// 'P Bill Yomes') that Bill wants kept distinct from Unassigned. Update this
// list by hand if the real deacon roster changes; list_deacons() already
// includes 'Unassigned' in its own output.
const DEACON_OPTIONS = [
  'Bill Crook',
  'Dino Mathena',
  'Gerry DiMatteo',
  'Jesse Franco',
  'Jim Bouchat',
  'Ray Williams',
  'Tom Smith',
  'Elders & Deacons',
  'P Bill Yomes',
  'Unassigned',
]

export const COLUMNS: Col[] = [
  { key: 'name', label: 'Name', type: 'text', defaultVisible: true },
  { key: 'email', label: 'Email', type: 'text', defaultVisible: true },
  { key: 'phone', label: 'Phone', type: 'text', defaultVisible: true },
  { key: 'status', label: 'Status (legacy)', type: 'select', options: ['visitor', 'member', 'active'] },
  {
    key: 'member_status',
    label: 'Member Status (legacy)',
    type: 'select',
    options: ['active', 'non_local', 'disconnected'],
  },
  {
    key: 'partnership_status',
    label: 'Partnership (legacy)',
    type: 'select',
    options: ['Partner', 'Regular Attender', 'Guest'],
  },
  {
    key: 'partner',
    label: 'Partner',
    type: 'select',
    options: ['partner', 'np'],
    defaultVisible: true,
  },
  {
    key: 'connected',
    label: 'Connected',
    type: 'select',
    options: ['1st time', '2nd time', 'guest', 'regular', 'at risk', 'critical'],
    defaultVisible: true,
    readOnly: true,
  },
  {
    key: 'active_v2',
    label: 'Active',
    type: 'select',
    options: ['active', 'non-active', 'disconnected', 'deceased'],
    defaultVisible: true,
  },
  {
    key: 'residency',
    label: 'Residency',
    type: 'select',
    options: ['local', 'non-local', 'snowbird'],
    defaultVisible: true,
  },
  {
    key: 'campus_preference',
    label: 'Campus',
    type: 'select',
    options: ['Wilmington', 'Online', 'Hybrid'],
    defaultVisible: true,
  },
  {
    key: 'deacon',
    label: 'Deacon',
    type: 'select',
    options: DEACON_OPTIONS,
    defaultVisible: true,
  },
  { key: 'active', label: 'Active (legacy)', type: 'bool' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['male', 'female'] },
  {
    key: 'household_role',
    label: 'Household Role',
    type: 'select',
    options: ['head', 'wife', 'husband', 'child'],
  },
  { key: 'household_id', label: 'Household ID', type: 'text' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'birthdate', label: 'Birthdate', type: 'date' },
  { key: 'first_visit_date', label: 'First Visit', type: 'date' },
  { key: 'started_serving_date', label: 'Serving Since', type: 'date' },
  { key: 'service_pin_notes', label: 'Service Pin Notes', type: 'text' },
  { key: 'deacon_status', label: 'Deacon Status (legacy)', type: 'text' },
  { key: 'status_reason', label: 'Status Reason (legacy)', type: 'text' },
  { key: 'status_since', label: 'Status Since (legacy)', type: 'date' },
  { key: 'status_note', label: 'Status Note (legacy)', type: 'text' },
  { key: 'snowbird_return', label: 'Snowbird Return (legacy)', type: 'text' },
  { key: 'shepherding_exempt', label: 'Shepherding Exempt', type: 'bool' },
  { key: 'carrier', label: 'Carrier', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text' },
  { key: 'created_at', label: 'Created', type: 'text', readOnly: true },
  { key: 'updated_at', label: 'Updated', type: 'text', readOnly: true },
]

export const FILTERABLE = COLUMNS.filter((c) => c.type === 'select' || c.type === 'bool')
