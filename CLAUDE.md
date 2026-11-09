@AGENTS.md

## Default order for lists of people (Bill, 2026-10-27, standing rule)
Every list of people sorts by **last name, then household, then first name** so families stay together. Use the helpers in
`src/lib/people.ts` (`sortByLastName`, `sortKidsByLastName`, `byLastName`); never hand-roll a first-name or `ORDER BY name` sort.
Last name = final word of the name. Only deviate when the user explicitly asks for a different order for that list.

## Standard header (Bill, 2026-11-09)
Every Watson-built page uses `src/app/cat/WatsonBar.tsx`: a bar in Watson's blue (#064C7C), the white Watson icon (`public/watson-icon-white.png`) and the word "Watson" beside it, left-justified. Clicking the bar (icon or word) hard-refreshes the current page; it does not link anywhere else (Bill, 2026-11-09, standard unless he says otherwise). Do not invent other headers and do not use 9e9 branding on Watson pages. No PINs or logins on new tools unless Bill asks.

## What Watson is (Bill, 2026-11-09)
Watson is Bill's personal assistant who helps him at Catalyst. He is not Catalyst's assistant. The `/cat` directory is only a way to keep Bill's things organized. Church-facing features live in 9e9 (catalyst.9e9.app), not here.
