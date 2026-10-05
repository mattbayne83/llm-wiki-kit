# Log

Newest first. Never edit an old entry. Heading shape: `## [YYYY-MM-DD] kind | title`.

## [2026-10-05] decision | Person and organization page types

- Updated: concepts/shared-schema.md
- Updated: concepts/typed-edges.md
- New folders people/ and organizations/; edges reports-to/manages and succeeds/succeeded-by
- edgeTargetType accepts a list, so owned-by can point at a team, person or organization
- The W4 exemption list moved from linter code into the schema as canonExempt

## [2026-10-04] feat | Article stats, collapsible sidebar, phone header

- Updated: systems/reader-app.md
- Stats count prose only, the same view of the text the linter takes
- Phone header shows nav icons only; the third tab had crowded the search button
- A bare wikilink to a hyphenated title stays lowercase mid-sentence

## [2026-10-04] feat | Decks: shell, intro deck and catalog in the reader

- Created: systems/decks.md
- Updated: systems/wiki-layer.md
- Updated: systems/reader-app.md
- Decks build to single HTML files with one inliner shared with the reader export, which dropped a dependency with an open advisory
- A deck is stale when a source page is logged after its updated date, or its shell fingerprint is old

## [2026-10-04] feat | Sections menu, back to top, presentation scale, graph zoom

- Updated: systems/reader-app.md
- Sections menu and heading anchors share one function, so they cannot drift
- Graph zoom keeps a plain click distinct from the end of a drag
- Pre-commit markdown lint checks staged files only; it had failed a commit over untracked work in progress

## [2026-10-04] feat | Reader app with search, graph and citation index

- Added: app/ (reader, graph, command palette, single-file export)
- Updated: systems/reader-app.md
- Schema, edge keys and type colors come from wiki/_schema.json
- Citation popovers list the pages that cite each source

## [2026-10-04] hygiene | wiki pass after first compile

- Fossil grep: 6 hits, all pages quoting the phrases rather than using them. None fixed.
- Updated: questions/q-automate-fossil-check.md
- Duplicate tables: none; each table appears on one page.
- Longest page is 39 lines, well under every soft limit.
- Question statuses match their evidence.

## [2026-10-04] lint | 1 issue found, 0 fixed

- Ran: npm run lint:wiki
- Found: the hygiene kind was declared in _kinds.json before any entry used it. Resolved by running the pass above, not by deleting the kind.

## [2026-10-04] decision | Schema shared by linter and reader

- Updated: concepts/shared-schema.md
- Updated: systems/wiki-linter.md
- Updated: systems/reader-app.md

## [2026-10-04] ingest | Enforcement lessons from the first instance

- Source: raw/design-notes/2026-10-04-enforcement-lessons.md
- Created: concepts/canon-map.md
- Created: concepts/fact-registry.md
- Created: concepts/operations-log.md
- Created: concepts/update-over-create.md
- Created: concepts/tomorrow-morning-test.md
- Created: systems/wiki-linter.md
- Created: systems/pre-commit-hook.md
- Created: processes/hygiene-pass.md
- Created: processes/lint.md
- Created: questions/q-lint-vs-review.md
- Created: questions/q-automate-fossil-check.md

## [2026-10-04] ingest | Origin and shape of the wiki pattern

- Source: raw/design-notes/2026-10-04-origin-and-shape.md
- Created: systems/raw-layer.md
- Created: systems/wiki-layer.md
- Created: systems/reader-app.md
- Created: concepts/shared-schema.md
- Created: concepts/typed-edges.md
- Created: concepts/known-unknowns.md
- Created: concepts/supersede-in-place.md
- Created: concepts/page-zones.md
- Created: processes/ingest.md
- Created: processes/query.md
- Created: people-teams/agent-maintainers.md
- Created: people-teams/human-readers.md
- Created: projects/llm-wiki-kit.md
- Created: questions/q-scale-ceiling.md
