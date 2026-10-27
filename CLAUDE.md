@AGENTS.md

## Default order for lists of people (Bill, 2026-10-27, standing rule)
Every list of people sorts by **last name, then household, then first name** so families stay together. Use the helpers in
`src/lib/people.ts` (`sortByLastName`, `sortKidsByLastName`, `byLastName`); never hand-roll a first-name or `ORDER BY name` sort.
Last name = final word of the name. Only deviate when the user explicitly asks for a different order for that list.
