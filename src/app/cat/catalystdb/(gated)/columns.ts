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

export const COLUMNS: Col[] = [
  { key: 'name', label: 'Name', type: 'text', defaultVisible: true },
  { key: 'email', label: 'Email', type: 'text', defaultVisible: true },
  { key: 'phone', label: 'Phone', type: 'text', defaultVisible: true },
  { key: 'status', label: 'Status', type: 'select', options: ['visitor', 'member', 'active'], defaultVisible: true },
  {
    key: 'member_status',
    label: 'Member Status',
    type: 'select',
    options: ['active', 'non_local', 'disconnected'],
    defaultVisible: true,
  },
  {
    key: 'partnership_status',
    label: 'Partnership',
    type: 'select',
    options: ['Partner', 'Regular Attender', 'Guest'],
    defaultVisible: true,
  },
  {
    key: 'campus_preference',
    label: 'Campus',
    type: 'select',
    options: ['Wilmington', 'Online', 'Hybrid'],
    defaultVisible: true,
  },
  { key: 'deacon', label: 'Deacon', type: 'text', defaultVisible: true },
  { key: 'active', label: 'Active', type: 'bool', defaultVisible: true },
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
  { key: 'deacon_status', label: 'Deacon Status', type: 'text' },
  { key: 'status_reason', label: 'Status Reason', type: 'text' },
  { key: 'status_since', label: 'Status Since', type: 'date' },
  { key: 'status_note', label: 'Status Note', type: 'text' },
  { key: 'snowbird_return', label: 'Snowbird Return', type: 'text' },
  { key: 'shepherding_exempt', label: 'Shepherding Exempt', type: 'bool' },
  { key: 'carrier', label: 'Carrier', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text' },
  { key: 'created_at', label: 'Created', type: 'text', readOnly: true },
  { key: 'updated_at', label: 'Updated', type: 'text', readOnly: true },
]

export const FILTERABLE = COLUMNS.filter((c) => c.type === 'select' || c.type === 'bool')
