// The one list of tools Donna and Bill reach from the Catalyst Database menu.
// Add a new tool here and it shows up in the menu; nothing else to wire.
// Each tool keeps its own login (the tracker is link-only, Connection uses the
// Shepherding PIN, Attendance Rules shares the Catalyst Database PIN session).
export type CatTool = { name: string; href: string; note: string }
export type CatToolSection = { title: string; tools: CatTool[] }

export const CAT_TOOL_SECTIONS: CatToolSection[] = [
  {
    title: 'Attendance',
    tools: [
      { name: 'Sunday Attendance', href: '/cat/tracker', note: 'Worship check-in by campus' },
      { name: 'Kids', href: '/cat/tracker?tab=kids', note: 'Kids classes, 9 AM and 10 AM' },
      { name: 'Groups', href: '/cat/tracker?tab=groups', note: 'Small groups and events' },
      { name: 'Serving', href: '/cat/tracker?tab=serving', note: 'Who served Sunday' },
      { name: 'Attendance Rules', href: '/cat/attsched', note: 'Auto-sent links, leaders, messages' },
    ],
  },
  {
    title: 'People',
    tools: [
      { name: 'Servant Teams', href: '/cat/servants', note: 'Team rosters' },
      { name: 'Connection', href: '/cat/connection', note: 'How connected each person is' },
      { name: 'Birthdays & Anniversaries', href: '/cat/bday', note: 'Upcoming dates' },
      { name: 'Paper Connect Cards', href: '/cat/papercards', note: 'Enter paper cards' },
    ],
  },
  {
    title: 'Clean-up',
    tools: [
      { name: 'Duplicate Members', href: '/cat/duplicates', note: 'Review and merge' },
      { name: 'Duplicate Event Registrations', href: '/cat/event-duplicates', note: 'Review repeat sign-ups' },
    ],
  },
  {
    title: 'Other',
    tools: [
      { name: 'Deacon App', href: '/cat/deaconapp', note: 'Deacon care tools' },
      { name: 'Catalyst Social', href: '/cat/social', note: 'Social posts' },
      { name: 'Connect Card (public form)', href: '/cat/connect', note: 'What visitors fill out' },
    ],
  },
]
