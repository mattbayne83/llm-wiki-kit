---
name: wiki
description: "Maintain this repo's LLM wiki. Use when ingesting a source, answering a question from the wiki, or linting it. Triggers: 'add this to the wiki', 'ingest', 'what do we know about', 'lint the wiki', 'hygiene pass'."
---

# Wiki operations

Two ideas drive this. Andrej Karpathy's: "the LLM writes and maintains the wiki; the human reads and asks questions." Garry Tan's gbrain: every page is an entity with typed edges, answers are cited, and every page says what it doesn't know yet.

`raw/` holds sources. `wiki/` holds compiled pages. The markdown files are the graph; there is no database. Rules are in [AGENTS.md](../../../AGENTS.md) and the anti-debt standard is in [docs/hygiene.md](../../../docs/hygiene.md). Exact formats are in `references/`.

## Page schema

```yaml
---
type: system | process | concept | team | person | organization | project | location | question
edges:
  feeds: [slug]          # data or output flows to
  fed-by: [slug]         # inverse of feeds, declared on both pages
  depends-on: [slug]     # needs this to work
  supports: [slug]       # inverse of depends-on
  owned-by: [slug]       # a team, person or organization page
  part-of: [slug]        # containment
  runs-at: [slug]        # must be a location page
  causes: [slug]         # causal contribution
  resolved-by: [slug]    # who or what fixes it
  reports-to: [slug]     # a person page; inverse of manages
  manages: [slug]        # a person page; inverse of reports-to
  succeeds: [slug]       # took over from (acquisition, role handoff)
  succeeded-by: [slug]   # inverse of succeeds
last-verified: 2026-10-04    # optional; lint warns when it ages past the schema's staleDays
# question pages only
status: open | partially-answered | answered
horizon: now | next | later | parked
hypothesis: One falsifiable sentence.
evidence:
  for:
    - raw: raw/<topic>/<file>.md
      note: what it shows
  against: []
---
```

`wiki/_schema.json` is the authority for folders, types and edge keys. The comment list above mirrors it for reading.

Rules:

- Include only the edge keys that apply. `edges: {}` is fine.
- Prose links use `[[slug]]` or `[[slug|label]]`. Anchored links (`[[slug#part]]`) fail lint because the reader cannot follow them.
- Evidence points at raw paths, not wiki slugs. Raw files are sources, not entities, so they stay out of the graph.

### Questions

A question page is a research thread. `hypothesis` is the headline: one falsifiable sentence with no citations. The `## Answer` (or `## Answer (partial)`) section holds the cited detail behind it. When an ingest moves the answer, update the hypothesis, the evidence ledger and the Answer section in the same edit. The headline and the detail must never disagree.

## Ingest

Always both steps: save the source, then compile it.

1. **Save.** Write `raw/<topic>/YYYY-MM-DD-slug.md` using [raw-template.md](../../../references/raw-template.md). The date is the publish date. Keep the original text; strip only formatting noise.
2. **Compile.** Find the canon home in `wiki/_canon.json` and update it. Follow the [article template](../../../references/article-template.md) zone order: Identity, Start here, Stable body, Evidence log, Known Unknowns, See Also.
   - Update the dated "Start here" first.
   - At most 3 to 5 bullets under a dated H3 for meeting detail. Often a log entry is enough.
   - Never paste a table that already has a home. Link it.
   - When sources disagree, say so on every affected page and attribute each side.
3. **Re-read the questions.** Name every `questions/` page this source touches and open each one. If the evidence answers or narrows it, update status, hypothesis, evidence and Answer now. Questions go stale because nobody re-opens them after the answer lands somewhere else.
4. **Cascade.** Update edges and their inverses. Refresh `last-verified` on pages you checked.
5. **Index and log.** Add or update the row in `wiki/index.md` under the `##` section that matches the page's folder. Add an entry at the top of `wiki/log.md`:

   ```markdown
   ## [2026-10-04] ingest | Title of the main page touched

   - Updated: concepts/fact-registry.md
   - Updated: questions/q-does-lint-replace-review.md
   ```

   Name every touched page on its own bullet. Tools read these bullets; "updated all concept pages" is invisible to them. The kind (`ingest`) must exist in `wiki/_kinds.json`. Kinds name the activity, never the topic.
6. **Lint.** `npm run lint:wiki`. Fix every `E` code before committing.
7. **Decks.** A deck that cites a page you changed shows a stale lamp in the reader's Decks view. Update the deck, bump its `updated:` date and run `npm run decks`, or leave it stale on purpose and say so in the log.

## Query

1. Start at `wiki/index.md`.
2. Read the pages it points to. Prefer wiki content over your training data.
3. Answer with links to the pages you used, and say plainly what the wiki does not know. Offer to open a `questions/` page for the gap.
4. A plain query writes no files. To keep an answer, file it with [archive-template.md](../../../references/archive-template.md) and index it with an `[Archived]` prefix. Archived pages are snapshots and are never cascade-updated.

## Lint

```bash
npm run lint:wiki            # report; exits 1 on any error
npm run lint:wiki -- --fix   # add missing inverse edges, then re-check
npm run lint:wiki -- --strict-warns   # warnings fail too
```

The rule list with codes is at the top of `scripts/wiki-lint.mjs`. The linter can't catch contradictions between pages, stale claims, uncited claims, or a question whose answer quietly arrived elsewhere. The weekly hygiene pass in [docs/hygiene.md](../../../docs/hygiene.md) covers those.

Log lint runs that changed something: `## [YYYY-MM-DD] lint | N issues found, M fixed`.
