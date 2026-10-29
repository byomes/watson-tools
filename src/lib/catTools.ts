// The one list of tools Donna and Bill reach from the Catalyst Database menu.
// Add a new tool here and it shows up in the menu; nothing else to wire.
// Each tool keeps its own login (the tracker is link-only, Connection uses the
// Shepherding PIN, Attendance Rules shares the Catalyst Database PIN session).
export type CatTool = { name: string; href: string; note: string; admin?: boolean; children?: CatTool[] }
export type CatToolSection = { title: string; tools: CatTool[] }

export const CAT_TOOL_SECTIONS: CatToolSection[] = [
  {
    title: 'Attendance',
    tools: [
      {
        name: 'Attendance Tracker',
        href: '/cat/tracker',
        note: 'Record who was here',
        children: [
          { name: 'Sunday', href: '/cat/tracker?tab=sunday', note: 'Worship by campus' },
          { name: 'Kids', href: '/cat/tracker?tab=kids', note: 'Kids classes, 9 AM and 10 AM' },
          { name: 'Groups', href: '/cat/tracker?tab=groups', note: 'Small groups and events' },
          { name: 'Serving', href: '/cat/tracker?tab=serving', note: 'Who served Sunday' },
        ],
      },
      { name: 'Attendance Rules', href: '/cat/attsched', note: 'Auto-sent links, leaders, messages', admin: true },
    ],
  },
  {
    title: 'People',
    tools: [
      { name: 'Servant Teams', href: '/cat/servants', note: 'Team rosters', admin: true },
      { name: 'Connection', href: '/cat/connection', note: 'How connected each person is', admin: true },
      { name: 'Birthdays & Anniversaries', href: '/cat/bday', note: 'Upcoming dates' },
      { name: 'Paper Connect Cards', href: '/cat/papercards', note: 'Enter paper cards' },
      { name: 'Kids Servants Today', href: '/cat/kidstoday', note: 'Change today\'s class servants' },
    ],
  },
  {
    title: 'Events',
    tools: [
      {
        name: 'Events',
        href: '/cat/events',
        note: 'Live RSVPs',
        admin: true,
        children: [{ name: 'Servant Leaders Banquet', href: '/cat/events', note: 'Who is coming, who has not answered' }],
      },
    ],
  },
  {
    title: 'Clean-up',
    tools: [
      { name: 'Duplicate Members', href: '/cat/duplicates', note: 'Review and merge', admin: true },
      { name: 'Duplicate Event Registrations', href: '/cat/event-duplicates', note: 'Review repeat sign-ups', admin: true },
    ],
  },
  {
    title: 'Other',
    tools: [
      { name: 'Shepherd App', href: '/cat/deaconapp', note: 'Shepherd care tools' },
      { name: 'Catalyst Social', href: '/cat/social', note: 'Social posts', admin: true },
      { name: 'Connect Card (public form)', href: '/cat/connect', note: 'What visitors fill out' },
    ],
  },
]

/** The sections with only the admin tools (admin = true) or only the everyday tools (admin = false), so each tool shows in exactly one place. */
export function toolSections(admin: boolean): CatToolSection[] {
  return CAT_TOOL_SECTIONS.map((sec) => ({ ...sec, tools: sec.tools.filter((t) => Boolean(t.admin) === admin) })).filter((sec) => sec.tools.length > 0)
}
export const ADMIN_TOOL_HREFS = new Set(CAT_TOOL_SECTIONS.flatMap((sec) => sec.tools).filter((t) => t.admin).flatMap((t) => [t.href, ...(t.children ?? []).map((c) => c.href.split('?')[0])]))
