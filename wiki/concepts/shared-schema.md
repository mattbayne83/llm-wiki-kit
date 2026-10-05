---
type: concept
edges:
  supports: [wiki-linter, reader-app]
last-verified: 2026-10-04
---

# Shared schema

> Raw: [enforcement lessons](../../raw/design-notes/2026-10-04-enforcement-lessons.md)

## Overview

`wiki/_schema.json` defines folders, page types, edge keys, inverse pairs, edge target types, question fields, soft page sizes and the staleness limit. The [[wiki-linter]] and the [[reader-app]] both import it. There is no second copy.

## Start here (as of 2026-10-05)

- Nine folders, each mapped to one type: systems, processes, concepts, people-teams, people, organizations, projects, locations, questions.
- Thirteen edge keys, four inverse pairs (`feeds`/`fed-by`, `depends-on`/`supports`, `reports-to`/`manages`, `succeeds`/`succeeded-by`). See [[typed-edges]].
- An edge target type is one type or a list: `owned-by` accepts a team, person or organization; `runs-at` must point at a location; `reports-to` and `manages` point at people.
- `canonExempt` lists the types that need no concern row in `_canon.json`: entities (teams, people, organizations, locations) and questions.

## Why one file

In the first instance the linter and the app each hardcoded folder names and edge keys. Adding a folder meant editing both, and the app silently dropped an edge key the linter accepted. The same thing happened with log kinds, mapped three times and wrong in two. Shared data beats a rule that says "keep these in sync". [raw](../../raw/design-notes/2026-10-04-enforcement-lessons.md)

Changing the schema is a decision, so it gets a `decision` entry in the [[operations-log]].
