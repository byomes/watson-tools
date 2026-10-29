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
  multiline?: boolean
}

// Deacon dropdown. Starts with just the unassigned marker (no church-specific names live in code), then the board swaps in the live list from
// /api/cat/catalystdb/state (deacon_rules.assignable_lists + the reserved buckets) via setDeaconOptions(), so a list made on the
// DSS dashboard shows up here too. Mutated in place on purpose: every dropdown reads COLUMNS' options array by reference.
const DEACON_OPTIONS: string[] = ['--']

export function setDeaconOptions(list: string[] | undefined) {
  if (!list || !list.length) return
  DEACON_OPTIONS.splice(0, DEACON_OPTIONS.length, ...list)
}

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
    // Computed live from attendance by default (Watson's own logic, e.g.
    // an anniversary-service one-off still shows '1st time'/'guest' the
    // normal way) -- editable as of 2026-09-24 so a permanent
    // reclassification (someone we know isn't coming back) can be pinned
    // manually. '--' clears a manual pin and hands the member back to the
    // live computation.
    key: 'connected',
    label: 'Connected',
    type: 'select',
    options: ['neighbor', '1st time', '2nd time', 'guest', 'regular', 'at risk', 'critical', 'disconnected', '--'],
    defaultVisible: true,
  },
  {
    key: 'active',
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
  },
  {
    key: 'campus_preference',
    label: 'Campus',
    type: 'select',
    options: ['Wilmington', 'Online', 'Hybrid', '--'],
  },
  {
    key: 'deacon',
    label: 'Shepherd',
    type: 'select',
    options: DEACON_OPTIONS,
    defaultVisible: true,
  },
  { key: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', '--'] },
  {
    key: 'household_role',
    label: 'Household Role',
    type: 'select',
    options: ['head', 'wife', 'husband', 'widow', 'widower', 'child', 'young adult', '--'],
  },
  { key: 'household_id', label: 'Household ID', type: 'text' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'birthdate', label: 'Birthdate', type: 'date' },
  { key: 'anniversary', label: 'Anniversary', type: 'date' },
  { key: 'first_visit_date', label: 'First Visit', type: 'date' },
  { key: 'second_visit_date', label: 'Second Visit', type: 'date' },
  { key: 'started_serving_date', label: 'Serving Since', type: 'date' },
  { key: 'service_pin_notes', label: 'Service Pin Notes', type: 'text' },
  { key: 'unsubscribed', label: 'Unsubscribed', type: 'bool' },
  { key: 'notes', label: 'Import notes', type: 'text' },
  // Human memory only ("who is this?"), edited in the person's Details; never used in reports or answers.
  { key: 'profile_notes', label: 'Notes', type: 'text', multiline: true },
  { key: 'created_at', label: 'Created', type: 'text', readOnly: true },
  { key: 'updated_at', label: 'Updated', type: 'text', readOnly: true },
]

export const FILTERABLE = COLUMNS.filter((c) => c.type === 'select' || c.type === 'bool')
