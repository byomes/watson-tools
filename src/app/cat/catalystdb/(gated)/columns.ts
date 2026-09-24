// Single source of truth for every editable members column -- drives the
// table, the inline cell editor, the filter bar, and the bulk-edit field
// picker in CatalystDBBoard.tsx. Keeping this as data (not per-column JSX)
// is what lets one grid component handle all fields.
//
// 2026-09-24: all legacy status/member_status/partnership_status/
// deacon_status/status_reason/status_since/status_note/snowbird_return
// columns (and the legacy boolean `active`) removed from the grid entirely
// -- Partner/Connected/Active/Residency/Deacon are now the only source of
// truth here. carrier and shepherding_exempt columns dropped from the DB
// itself (see jobs/congregation/migrate_catalystdb_grid_cleanup.py on the
// Beelink) and removed here too. anniversary/unsubscribed added. Every
// select-type column now carries '--' as an explicit option (even ones
// that are always populated today) so any future gap is visible and
// filterable rather than silently blank.
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
  '--',
]

export const COLUMNS: Col[] = [
  { key: 'name', label: 'Name', type: 'text', defaultVisible: true },
  { key: 'email', label: 'Email', type: 'text', defaultVisible: true },
  { key: 'phone', label: 'Phone', type: 'text', defaultVisible: true },
  {
    key: 'partner',
    label: 'Partner',
    type: 'select',
    options: ['partner', 'np', '--'],
    defaultVisible: true,
  },
  {
    key: 'connected',
    label: 'Connected',
    type: 'select',
    options: ['1st time', '2nd time', 'guest', 'regular', 'at risk', 'critical', 'neighbor'],
    defaultVisible: true,
    readOnly: true,
  },
  {
    key: 'active_v2',
    label: 'Active',
    type: 'select',
    options: ['active', 'non-active', 'disconnected', 'deceased', '--'],
    defaultVisible: true,
  },
  {
    key: 'residency',
    label: 'Residency',
    type: 'select',
    options: ['local', 'non-local', 'snowbird', '--'],
    defaultVisible: true,
  },
  {
    key: 'campus_preference',
    label: 'Campus',
    type: 'select',
    options: ['Wilmington', 'Online', 'Hybrid', '--'],
    defaultVisible: true,
  },
  {
    key: 'deacon',
    label: 'Deacon',
    type: 'select',
    options: DEACON_OPTIONS,
    defaultVisible: true,
  },
  { key: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', '--'] },
  {
    key: 'household_role',
    label: 'Household Role',
    type: 'select',
    options: ['head', 'wife', 'husband', 'child', '--'],
  },
  { key: 'household_id', label: 'Household ID', type: 'text' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'birthdate', label: 'Birthdate', type: 'date' },
  { key: 'anniversary', label: 'Anniversary', type: 'date', defaultVisible: true },
  { key: 'first_visit_date', label: 'First Visit', type: 'date' },
  { key: 'started_serving_date', label: 'Serving Since', type: 'date' },
  { key: 'service_pin_notes', label: 'Service Pin Notes', type: 'text' },
  { key: 'unsubscribed', label: 'Unsubscribed', type: 'bool', defaultVisible: true },
  { key: 'notes', label: 'Notes', type: 'text' },
  { key: 'created_at', label: 'Created', type: 'text', readOnly: true },
  { key: 'updated_at', label: 'Updated', type: 'text', readOnly: true },
]

export const FILTERABLE = COLUMNS.filter((c) => c.type === 'select' || c.type === 'bool')
