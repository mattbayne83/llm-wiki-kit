# Wiki index

Start here. Each section matches a folder; each row is one page.

## systems

Tools and stores the kit is made of.

| Article | Summary | Updated |
| --- | --- | --- |
| [Raw layer](systems/raw-layer.md) | Append-only sources in markdown; history, not knowledge | 2026-10-04 |
| [Wiki layer](systems/wiki-layer.md) | Compiled pages and special files; the single source of truth | 2026-10-04 |
| [Wiki linter](systems/wiki-linter.md) | Zero-dependency structural checks, E1 to E10 and W1 to W6 | 2026-10-04 |
| [Pre-commit hook](systems/pre-commit-hook.md) | Raw, docs, wiki and markdown gates on every commit | 2026-10-04 |
| [Decks](systems/decks.md) | Slide decks rendered from wiki pages, with a stale lamp | 2026-10-04 |
| [Reader app](systems/reader-app.md) | Reader, search and graph over the wiki; holds no knowledge | 2026-10-04 |

## processes

How the wiki gets written and kept clean.

| Article | Summary | Updated |
| --- | --- | --- |
| [Ingest](processes/ingest.md) | Save a source, compile it, re-read touched questions, log it | 2026-10-04 |
| [Query](processes/query.md) | Answer from the wiki with citations and named gaps | 2026-10-04 |
| [Lint](processes/lint.md) | Run the linter; errors block, warnings feed the hygiene pass | 2026-10-04 |
| [Hygiene pass](processes/hygiene-pass.md) | Weekly review for decay lint cannot see | 2026-10-04 |

## concepts

Ideas and rules the system runs on.

| Article | Summary | Updated |
| --- | --- | --- |
| [Shared schema](concepts/shared-schema.md) | One JSON file defines folders, types and edges for every tool | 2026-10-05 |
| [Typed edges](concepts/typed-edges.md) | Frontmatter relations by kind, with inverse rules | 2026-10-05 |
| [Canon map](concepts/canon-map.md) | One home per idea, enforced from JSON | 2026-10-04 |
| [Fact registry](concepts/fact-registry.md) | Hot strings that fail lint off their home page | 2026-10-04 |
| [Known unknowns](concepts/known-unknowns.md) | Four layers for what the wiki does not know | 2026-10-04 |
| [Operations log](concepts/operations-log.md) | Newest-first history with declared activity kinds | 2026-10-04 |
| [Update over create](concepts/update-over-create.md) | When a new page is justified, and when it is not | 2026-10-04 |
| [Supersede in place](concepts/supersede-in-place.md) | Changing direction without leaving fossils | 2026-10-04 |
| [Page zones](concepts/page-zones.md) | Reading order for long pages | 2026-10-04 |
| [Tomorrow-morning test](concepts/tomorrow-morning-test.md) | Which numbers belong on a canon page | 2026-10-04 |

## people-teams

Who writes and who reads.

| Article | Summary | Updated |
| --- | --- | --- |
| [Agent maintainers](people-teams/agent-maintainers.md) | Coding agents that write the wiki under AGENTS.md | 2026-10-04 |
| [Human readers](people-teams/human-readers.md) | People who read, ask and point agents at sources | 2026-10-04 |

## projects

Named efforts.

| Article | Summary | Updated |
| --- | --- | --- |
| [llm-wiki-kit](projects/llm-wiki-kit.md) | This starter kit and how to start your own | 2026-10-04 |

## questions

Open threads about the method.

| Article | Summary | Updated |
| --- | --- | --- |
| [How much of the hygiene pass can lint replace?](questions/q-lint-vs-review.md) | How much of the hygiene pass can lint replace? | 2026-10-04 |
| [Where does markdown-as-graph stop scaling?](questions/q-scale-ceiling.md) | Where does markdown-as-graph stop scaling? | 2026-10-04 |
| [Can a lint rule catch fossils?](questions/q-automate-fossil-check.md) | Can a lint rule catch fossils? | 2026-10-04 |
