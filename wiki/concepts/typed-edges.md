---
type: concept
edges:
  part-of: [shared-schema]
last-verified: 2026-10-04
---

# Typed edges

> Raw: [origin and shape](../../raw/design-notes/2026-10-04-origin-and-shape.md)

## Overview

Frontmatter `edges` say how a page relates to others, by kind. Prose `[[wikilinks]]` say "see also". Edges are data: the [[reader-app]] draws the graph from them and groups backlinks by kind. Wikilinks are navigation.

## Start here (as of 2026-10-05)

| Edge | Meaning | Constraint |
| --- | --- | --- |
| feeds / fed-by | Output flows from one to the other | Declared on both pages |
| depends-on / supports | Needs it to work | Declared on both pages |
| owned-by | Accountable team, person or organization | Target is a team, person or organization |
| part-of | Containment | |
| runs-at | Physical or named place | Target is a location |
| causes | Contributes to | |
| resolved-by | Who or what fixes it | |
| reports-to / manages | Reporting line between people | Both ends are people; declared on both pages |
| succeeds / succeeded-by | Took over from: an acquisition, a merger, a role handoff | Declared on both pages |

## Rules

- Values are slugs: file names without `.md`, unique across the wiki.
- Inline lists only (`part-of: [ingest]`). One shape is easier for both parsers.
- Include only keys that apply. `edges: {}` is valid.
- Inverses must match. `npm run lint:wiki -- --fix` writes the missing side.

Evidence on question pages is not an edge. It points at raw paths so sources stay out of the entity graph. [raw](../../raw/design-notes/2026-10-04-origin-and-shape.md)
