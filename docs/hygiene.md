# Wiki hygiene

The operating standard for keeping an agent-maintained wiki usable after hundreds of sessions. Read it before creating a page.

The problem it solves is documentation debt: parallel strategies, the same table in four places, and "current plan" prose that agents re-read as truth long after it stopped being true. `raw/` may be messy because it is history. `wiki/` may not be, because it is the product.

## 1. How debt forms

| Pattern | What it looks like | Fix |
| --- | --- | --- |
| Parallel strategy pages | Two pages both say what happens next | One page owns direction; others link to it |
| Copy-forward synthesis | The same summary table on four pages | Keep one table; the rest get a sentence and a link |
| Undated "current" claims | "Next week we will..." left for a month | Date the claim or delete it |
| A new page for every insight | Each chat session adds `concepts/new-thing.md` | Update the canon page; create only for a new entity or axis |
| Strategy only in raw | The decision exists in a meeting note and nowhere else | Compile it once into the canon page |
| Log as a second wiki | Agents read the whole log to learn what is true | The log is history; canon pages are truth |

## 2. The canon map

Pick the home before you write. Don't invent a second one.

The map lives in `wiki/_canon.json`, not in prose, because the linter reads it:

- `concerns` map each idea to its one page, with notes on who may mention it.
- `facts` register hot strings (thresholds, counts, names that change) with the page that owns them. With `enforce_facts: true`, the same string on any other page fails lint.

Edit the JSON. A prose copy of the map would drift from it.

Keep the axes separate on purpose. In most projects there are three to five: what success is, why the problem hurts, how the work climbs, how outcomes get scored. Each gets one page. If a new write-up doesn't fit an axis, decide whether it is a new entity, a question, or a duplicate.

## 3. Rules for every write

### Prefer update over create

1. Search `wiki/index.md` and the likely canon page for the same claim.
2. If the page exists, edit it.
3. Create a page only for a new entity, a new question, or a new axis. The last one is rare.

### Supersede in place

When direction changes:

1. Rewrite the canon page so its current paragraph is true now.
2. Optionally keep one short "Superseded (YYYY-MM-DD)" note with what changed and a raw citation.
3. Delete or rewrite every conflicting "we will" elsewhere. Two futures on two pages is the most common failure.

### Thin links, not thick copies

- One full table per idea in the whole wiki.
- Everywhere else: one to three sentences and a `[[wikilink]]`.
- When you create a page that owns a hot number, register it in `wiki/_canon.json` in the same change.

### Date current state

Write "Status (2026-10-04):" instead of "currently". Undated present tense is how a page lies six weeks later.

### The tomorrow-morning test

A canon page must not restate a number that a generated report refreshes on a schedule. Before putting a number in "Start here", ask: would this be wrong tomorrow morning without anyone doing anything wrong? If yes, it is a report reading. Put the rule and a pointer to the report on the page, not the reading. Numbers that pass are the ones only a decision changes: a threshold, an annual target, a published calendar.

### Questions absorb uncertainty

Five paragraphs of "we might" on a concept page is a question in disguise. One Known Unknowns bullet is fine. Anything bigger becomes a `questions/` page with a status.

### Log discipline

- Newest first. Never edit an old entry.
- Name each touched page on its own bullet.
- The log records what happened. It is not a place to park strategy that no canon page holds.

## 4. Long pages

Any page past about 80 lines follows this reading order:

| Zone | Content | Rule |
| --- | --- | --- |
| Identity | What it is, what it is not | Two short paragraphs at most |
| Start here | Present-tense table or 5 bullets, dated | Within the first 40 lines |
| Stable body | Definition, process, model | Timeless; update in place |
| Evidence log | Dated field notes | Newest first, or link raw only |
| Known Unknowns | Open items | 7 bullets at most |
| See Also | Links | No third essay |

Content that fits none of the first three zones is evidence, belongs on another page, or belongs in raw and the log.

Soft size limits per type live in `wiki/_schema.json` under `softMaxLines`. The linter warns past them and fails only with `--strict-warns`.

### Ingest without bloat

When compiling a meeting or document:

1. Update the "Start here" section on the canon page or pages.
2. Add at most 3 to 5 bullets under a dated H3, or only a log entry.
3. Don't paste a table that already has a home.
4. Undated "next week" is forbidden.
5. Name the questions this source touches and re-open each one. A question whose answer landed on another page and was never updated is the most common kind of rot, and the linter can't see it.

## 5. Cadence

| When | What |
| --- | --- |
| Every ingest | Canon homes only, thin links, index, log, `npm run lint:wiki` |
| Every synthesis session | Land on one canon page; add an axis to the map only if it is truly new |
| Weekly | The hygiene pass below |
| After a direction change | A supersession pass: grep the old slogans and fix or delete each hit |
| Quarterly, or when the structure feels noisy | The organization checklist |

### Hygiene pass

Copy into the log when you run it.

```text
## [YYYY-MM-DD] hygiene | wiki pass
- [ ] Canon map still accurate? Any new axis documented?
- [ ] Any page created in the last 7 days that should have been an edit?
- [ ] Grep for fossils: "next week", "we will", "currently", "soon".
- [ ] Duplicate tables: keep one, thin-link the rest.
- [ ] Question statuses honest? Any answer that landed elsewhere?
- [ ] Index summaries match each page's role?
- [ ] Log bullets name pages one per line?
```

### Organization checklist

```text
## [YYYY-MM-DD] hygiene | wiki org
- [ ] Page types still mutually exclusive and complete for this domain?
- [ ] Each page's type matches its folder and its real role?
- [ ] Titles tell near-duplicates apart?
- [ ] No question title hiding two questions?
- [ ] Process pages own steps; system pages own capabilities?
- [ ] Hub pages have edges? runs-at points only at locations?
```

Type placement:

| Type | Use when | Not when |
| --- | --- | --- |
| system | A named tool, app or data store | A process or a team |
| process | How work runs: steps, cadence, owners | What a tool can do (that is a system) |
| concept | A domain idea, catalog, glossary or strategy axis | A single place (that is a location) |
| team | A group that owns or runs things | One person's open question |
| project | A named effort with a direction | A standing process |
| location | One physical or named place | A ranking of places |
| person | One named individual and their role | A group (that is a team) |
| organization | A company or legal entity | A team inside one company |
| question | An open research thread | A settled definition (fold it into the concept) |

Don't add a top-level folder without updating `wiki/_schema.json` in the same change.

## 6. Agent contract

When asked to "add this to the wiki" or "write up our thinking":

1. Read the canon map.
2. Update the matching canon page.
3. Add thin pointers elsewhere, nothing thicker.
4. If you create a concept page, say in the log why it is a new axis.
5. For strategic changes, run the hygiene pass.

Agent anti-patterns:

- `concepts/thing-v2.md`
- The same narrative pasted into three pages
- Superseded plans left in present tense because they are "history"
- Catalogs filed as locations
