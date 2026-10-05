import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { lintWiki, addInverseEdges, normalizeFact, factHit, parseLog } from './wiki-lint.mjs'

const SCHEMA = join(dirname(fileURLToPath(import.meta.url)), '../wiki/_schema.json')
const TODAY = new Date('2026-10-04')

const BASE = {
  'raw/notes/2026-10-01-kickoff.md': '# Kickoff\n\n> Source: notes\n> Collected: 2026-10-01\n> Published: 2026-10-01\n\nText.\n',
  'wiki/systems/store.md': '---\ntype: system\nedges:\n  fed-by: [loader]\n  owned-by: [crew]\n---\n\n# Store\n\nKeeps rows for 30 days. See [[loader]] and [[q-retention]].\n',
  'wiki/systems/loader.md': '---\ntype: system\nedges:\n  feeds: [store]\n  owned-by: [crew]\n---\n\n# Loader\n\nWrites to [[store|the store]].\n',
  'wiki/people-teams/crew.md': '---\ntype: team\nedges: {}\n---\n\n# Crew\n\nRuns [[loader]].\n',
  'wiki/questions/q-retention.md':
    '---\ntype: question\nedges:\n  part-of: [store]\nstatus: open\nhorizon: now\nhypothesis: Thirty days is enough.\nevidence:\n  for:\n    - raw: raw/notes/2026-10-01-kickoff.md\n      note: stated\n  against: []\n---\n\n# Is retention long enough?\n\nSee [kickoff](../../raw/notes/2026-10-01-kickoff.md).\n',
  'wiki/index.md':
    '# Index\n\n## systems\n\n| Article | Summary | Updated |\n| --- | --- | --- |\n| [Store](systems/store.md) | s | 2026-10-04 |\n| [Loader](systems/loader.md) | l | 2026-10-04 |\n\n## people-teams\n\n| [Crew](people-teams/crew.md) | c | 2026-10-04 |\n\n## questions\n\n| [Retention](questions/q-retention.md) | q | 2026-10-04 |\n',
  'wiki/_canon.json': JSON.stringify({
    enforce_facts: true,
    concerns: [
      { concern: 'Storage', home: 'wiki/systems/store.md' },
      { concern: 'Loading', home: 'wiki/systems/loader.md' },
    ],
    facts: [{ id: 'retention', home: 'wiki/systems/store.md', patterns: ['30 days'] }],
  }),
  'wiki/_kinds.json': JSON.stringify({ kinds: { ingest: 'compiled a source', lint: 'ran the linter' } }),
  'wiki/log.md': '# Log\n\n## [2026-10-04] lint | 0 issues\n\n## [2026-10-01] ingest | Kickoff\n\n- Updated: systems/store.md\n',
}

function fixture(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wiki-lint-'))
  mkdirSync(join(root, 'wiki'), { recursive: true })
  cpSync(SCHEMA, join(root, 'wiki/_schema.json'))
  for (const [rel, text] of Object.entries({ ...BASE, ...overrides })) {
    if (text === null) continue
    mkdirSync(dirname(join(root, rel)), { recursive: true })
    writeFileSync(join(root, rel), text)
  }
  return root
}

const codes = (root) => lintWiki(root, { today: TODAY }).findings.map((f) => f.code)
const edit = (rel, from, to) => ({ [rel]: BASE[rel].replace(from, to) })

test('the base fixture is clean', () => {
  assert.deepEqual(lintWiki(fixture(), { today: TODAY }).findings, [])
})

test('E1 type must match folder', () => {
  assert.ok(codes(fixture(edit('wiki/systems/store.md', 'type: system', 'type: process'))).includes('E1'))
  assert.ok(codes(fixture({ 'wiki/systems/store.md': '# No frontmatter\n' })).includes('E1'))
})

test('E2 edge keys must be known, unique and inline', () => {
  assert.ok(codes(fixture(edit('wiki/systems/store.md', '  owned-by', '  owns'))).includes('E2'))
  assert.ok(codes(fixture(edit('wiki/systems/store.md', '  owned-by: [crew]', '  owned-by: [crew]\n  owned-by: [crew]'))).includes('E2'))
  assert.ok(codes(fixture(edit('wiki/systems/store.md', '  owned-by: [crew]', '  owned-by:\n    - crew'))).includes('E2'))
})

test('E3 edge targets must resolve', () => {
  assert.ok(codes(fixture(edit('wiki/systems/store.md', 'owned-by: [crew]', 'owned-by: [crew, ghost]'))).includes('E3'))
})

test('E4 owned-by must point at a team', () => {
  assert.ok(codes(fixture(edit('wiki/systems/store.md', 'owned-by: [crew]', 'owned-by: [loader]'))).includes('E4'))
})

test('E5 inverse edges are required and --fix adds them', () => {
  const root = fixture(edit('wiki/systems/store.md', '  fed-by: [loader]\n', ''))
  const { findings, missingInverses } = lintWiki(root, { today: TODAY })
  assert.deepEqual(findings.map((f) => f.code), ['E5'])
  addInverseEdges(root, missingInverses)
  assert.deepEqual(lintWiki(root, { today: TODAY }).findings, [])
  assert.match(readFileSync(join(root, 'wiki/systems/store.md'), 'utf8'), /fed-by: \[loader\]/)
})

test('E6 wikilinks must resolve and carry no anchor', () => {
  assert.ok(codes(fixture(edit('wiki/systems/loader.md', '[[store|the store]]', '[[stor]]'))).includes('E6'))
  assert.ok(codes(fixture(edit('wiki/systems/loader.md', '[[store|the store]]', '[[store#rows]]'))).includes('E6'))
})

test('E6 ignores links inside code', () => {
  const body = '\n```md\n[[nowhere]]\n```\n\nInline `[[also-nowhere]]` too.\n'
  assert.deepEqual(codes(fixture({ 'wiki/systems/loader.md': BASE['wiki/systems/loader.md'] + body })), [])
})

test('E7 relative links and evidence paths must exist', () => {
  assert.ok(codes(fixture(edit('wiki/questions/q-retention.md', '(../../raw/notes/2026-10-01-kickoff.md)', '(../../raw/notes/gone.md)'))).includes('E7'))
  assert.ok(codes(fixture(edit('wiki/questions/q-retention.md', 'raw: raw/notes/2026-10-01-kickoff.md', 'raw: raw/notes/gone.md'))).includes('E7'))
})

test('E8 index lists every page under its folder section', () => {
  assert.ok(codes(fixture(edit('wiki/index.md', '| [Crew](people-teams/crew.md) | c | 2026-10-04 |\n', ''))).includes('E8'))
  assert.ok(codes(fixture(edit('wiki/index.md', '## people-teams', '## teams'))).includes('E8'))
  assert.ok(codes(fixture(edit('wiki/index.md', '## questions', '## questions\n\n| [Gone](questions/q-gone.md) | g | 2026-10-04 |'))).includes('E8'))
})

test('E9 a registered fact may not appear off its home', () => {
  assert.ok(codes(fixture(edit('wiki/systems/loader.md', 'Writes to', 'Keeps ~**30 days**. Writes to'))).includes('E9'))
})

test('E9 fact matching respects numeric boundaries and allow lists', () => {
  assert.deepEqual(codes(fixture(edit('wiki/systems/loader.md', 'Writes to', 'Keeps 230 days. Writes to'))), [])
  const canon = JSON.parse(BASE['wiki/_canon.json'])
  canon.facts[0].allow = ['wiki/systems/loader.md']
  assert.deepEqual(codes(fixture({ ...edit('wiki/systems/loader.md', 'Writes to', 'Keeps 30 days. Writes to'), 'wiki/_canon.json': JSON.stringify(canon) })), [])
})

test('E10 log headings, kinds and order', () => {
  assert.ok(codes(fixture(edit('wiki/log.md', '## [2026-10-04] lint |', '## [2026-10-04]  lint |'))).includes('E10'))
  assert.ok(codes(fixture(edit('wiki/log.md', '] lint |', '] tidy |'))).includes('E10'))
  assert.ok(codes(fixture(edit('wiki/log.md', '2026-10-01', '2026-10-09'))).includes('E10'))
})

test('W1 to W6 warn without failing', () => {
  const long = BASE['wiki/systems/store.md'] + 'line\n'.repeat(130)
  const root = fixture({
    'wiki/systems/store.md': long.replace('---\n\n', 'last-verified: 2026-01-01\n---\n\n'),
    'wiki/projects/lonely.md': '---\ntype: project\nedges: {}\n---\n\n# Lonely\n',
    'wiki/index.md': BASE['wiki/index.md'] + '\n## projects\n\n| [Lonely](projects/lonely.md) | x | 2026-10-04 |\n',
    'wiki/questions/q-retention.md': BASE['wiki/questions/q-retention.md'].replace('horizon: now', 'horizon: someday'),
  })
  const found = new Set(codes(root))
  for (const code of ['W1', 'W2', 'W3', 'W4', 'W6']) assert.ok(found.has(code), code)
  assert.ok(codes(fixture(edit('wiki/systems/store.md', '30 days', 'a month'))).includes('W5'))
})

test('normalizeFact and factHit', () => {
  assert.equal(normalizeFact('~**30–40 days**'), '30-40 days')
  assert.ok(factHit('kept for 30 days', '30 days'))
  assert.ok(!factHit('kept for 130 days', '30 days'))
  assert.ok(!factHit('kept for 1,30 days', '30 days'))
})

test('parseLog separates entries from malformed headings', () => {
  const { entries, malformed } = parseLog('## [2026-10-04] ingest | A\n## [2026-10-04]ingest|B\n## Plain heading\n')
  assert.equal(entries.length, 1)
  assert.equal(malformed.length, 1)
})

const PERSON = {
  'wiki/people/pat.md': '---\ntype: person\nedges:\n  part-of: [crew]\n---\n\n# Pat\n\nRuns [[loader]].\n',
  'wiki/people/sam.md': '---\ntype: person\nedges:\n  reports-to: [pat]\n---\n\n# Sam\n\nWorks with [[pat]].\n',
}
const PERSON_INDEX = BASE['wiki/index.md'] +
  '\n## people\n\n| [Pat](people/pat.md) | p | 2026-10-04 |\n| [Sam](people/sam.md) | s | 2026-10-04 |\n'
const withPeople = (overrides = {}) => fixture({ ...PERSON, 'wiki/index.md': PERSON_INDEX, ...overrides })

test('E4 owned-by accepts a team, a person or an organization', () => {
  const root = withPeople({
    ...edit('wiki/systems/store.md', 'owned-by: [crew]', 'owned-by: [pat]'),
    'wiki/people/pat.md': PERSON['wiki/people/pat.md'].replace('part-of: [crew]', 'part-of: [crew]\n  manages: [sam]'),
  })
  assert.ok(!codes(root).includes('E4'))
})

test('E4 reports-to must point at a person', () => {
  const root = withPeople({
    'wiki/people/sam.md': PERSON['wiki/people/sam.md'].replace('reports-to: [pat]', 'reports-to: [crew]'),
  })
  const e4 = lintWiki(root, { today: TODAY }).findings.find((f) => f.code === 'E4')
  assert.match(e4.message, /must point at a person/)
})

test('E5 reports-to and manages are inverses and --fix adds the missing side', () => {
  const root = withPeople()
  const { findings, missingInverses } = lintWiki(root, { today: TODAY })
  assert.equal(findings.filter((f) => f.code === 'E5').length, 1)
  addInverseEdges(root, missingInverses)
  assert.match(readFileSync(join(root, 'wiki/people/pat.md'), 'utf8'), /manages: \[sam\]/)
  assert.ok(!codes(root).includes('E5'))
})

test('W4 skips types listed in canonExempt', () => {
  const found = lintWiki(withPeople(), { today: TODAY }).findings
  assert.ok(!found.some((f) => f.code === 'W4' && f.file.startsWith('wiki/people/')))
})
