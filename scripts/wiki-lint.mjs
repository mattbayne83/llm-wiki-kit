#!/usr/bin/env node
// Structural linter for wiki/. Zero dependencies.
//   node scripts/wiki-lint.mjs [--fix] [--strict-warns]
//
// Errors (exit 1):
//   E1  frontmatter missing, type missing or invalid, type does not match folder
//   E2  edge key unknown, duplicated, or not an inline [list]
//   E3  edge target does not resolve to a page
//   E4  edge target has the wrong type (schema edgeTargetType: a type or a list of types)
//   E5  inverse edge missing (feeds/fed-by, depends-on/supports). --fix adds it.
//   E6  [[wikilink]] does not resolve, or uses an #anchor the reader cannot follow
//   E7  relative .md link or evidence raw path does not exist on disk
//   E8  index.md: page not listed, listed file missing, or row under the wrong ## section
//   E9  _canon.json: a registered fact restated off its home page, or a home path missing
//   E10 log.md: malformed heading, undeclared or unused kind, entries out of date order
//
// Warnings (exit 0 unless --strict-warns):
//   W1  orphan: nothing links to the page, by edge or wikilink
//   W2  page body longer than its type's softMaxLines
//   W3  question missing or invalid status/horizon, or hypothesis without evidence
//   W4  page has no concern row in _canon.json
//   W5  a registered fact no longer appears on its own home page
//   W6  last-verified older than staleDays

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n/
const LOG_HEADING_RE = /^## \[(\d{4}-\d{2}-\d{2})\] ([a-z][a-z0-9+-]*) \| (\S.*)$/
const ORDER = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6']

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

// ---------- parsing ----------

function parsePage(root, folder, file) {
  const rel = `wiki/${folder}/${file}`
  const text = readFileSync(join(root, rel), 'utf8')
  const fmMatch = text.match(FRONTMATTER_RE)
  const fm = fmMatch ? fmMatch[1] : ''
  const body = fmMatch ? text.slice(fmMatch[0].length) : text
  const bodyOffset = fmMatch ? fmMatch[0].split('\n').length - 1 : 0

  const edges = {}
  const edgeLines = [] // { key, line, inline, values }
  const fmLines = fm.split('\n')
  const start = fmLines.findIndex((l) => /^edges:/.test(l))
  if (start >= 0 && !/^edges:\s*\{\s*\}\s*$/.test(fmLines[start])) {
    for (let i = start + 1; i < fmLines.length && /^ {2}\S/.test(fmLines[i]); i++) {
      const m = fmLines[i].match(/^ {2}([\w-]+):\s*(.*)$/)
      if (!m) continue
      const inline = m[2].match(/^\[([^\]]*)\]\s*$/)
      const values = inline ? inline[1].split(',').map((s) => s.trim()).filter(Boolean) : []
      edgeLines.push({ key: m[1], line: i + 2, inline: Boolean(inline), values })
      edges[m[1]] = [...new Set([...(edges[m[1]] ?? []), ...values])]
    }
  }

  const field = (name) => fm.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1].trim()
  const fieldLine = (name) => {
    const i = fmLines.findIndex((l) => l.startsWith(`${name}:`))
    return i >= 0 ? i + 2 : 1
  }
  const evidence = [...fm.matchAll(/^\s+- raw:\s*(\S+)/gm)].map((m) => ({
    path: m[1],
    line: fm.slice(0, m.index).split('\n').length + 1,
  }))

  return {
    rel,
    folder,
    slug: file.replace(/\.md$/, ''),
    text,
    hasFrontmatter: Boolean(fmMatch),
    body,
    bodyOffset,
    type: field('type'),
    edges,
    edgeLines,
    field,
    fieldLine,
    evidence,
  }
}

// Body lines with fenced blocks blanked and inline code removed, so pages can show
// link syntax in examples without the linter treating it as a real link.
function proseLines(body) {
  let fenced = false
  return body.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced
      return ''
    }
    return fenced ? '' : line.replace(/`[^`]*`/g, '')
  })
}

function loadPages(root, schema) {
  const pages = new Map()
  for (const folder of Object.keys(schema.folders)) {
    const dir = join(root, 'wiki', folder)
    if (!existsSync(dir)) continue
    for (const file of readdirSync(dir).sort()) {
      if (file.endsWith('.md')) {
        const page = parsePage(root, folder, file)
        pages.set(page.slug, page)
      }
    }
  }
  return pages
}

// ---------- fact matching ----------

// Patterns are compared on a normalized form. A raw substring test let real restatements
// walk past a green gate: `~**30 days**` missed `30 days` because bold markers split the
// span, and `~30 days` missed it because of one tilde. Normalization strips emphasis,
// folds dash and approximation variants, and collapses whitespace on both sides. It does
// not touch digits, units or word order.
export function normalizeFact(s) {
  return s
    .replace(/[*_`]/g, '')
    .replace(/[‐-―−]/g, '-')
    .replace(/[~∼≈]/g, '')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
}

// A hit must sit on a numeric boundary. Once tildes are gone, "230 days" contains
// "30 days", so the character before may not be a digit or comma and the one after
// may not be a digit.
export function factHit(haystack, needle) {
  if (!needle) return false
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + 1)) {
    const before = haystack[i - 1] ?? ''
    const after = haystack[i + needle.length] ?? ''
    if (!/[\d,]/.test(before) && !/\d/.test(after)) return true
  }
  return false
}

// ---------- log ----------

export function parseLog(text) {
  const entries = []
  const malformed = []
  text.split('\n').forEach((line, i) => {
    if (!line.startsWith('## ')) return
    const m = line.match(LOG_HEADING_RE)
    if (m) entries.push({ date: m[1], kind: m[2], title: m[3], line: i + 1 })
    else if (/^##\s*\[/.test(line)) malformed.push({ line: i + 1, text: line })
  })
  return { entries, malformed }
}

// ---------- checks ----------

export function lintWiki(root, { today = new Date() } = {}) {
  const schema = readJson(join(root, 'wiki/_schema.json'))
  const pages = loadPages(root, schema)
  const findings = []
  const missingInverses = []
  const add = (severity) => (code, file, line, message) => findings.push({ code, file, line, message, severity })
  const err = add('error')
  const warn = add('warning')
  const validTypes = new Set(Object.values(schema.folders))

  for (const p of pages.values()) {
    // E1
    const expected = schema.folders[p.folder]
    if (!p.hasFrontmatter) err('E1', p.rel, 1, 'page must open with a --- frontmatter block')
    else if (!p.type) err('E1', p.rel, 1, 'frontmatter missing type:')
    else if (!validTypes.has(p.type)) err('E1', p.rel, p.fieldLine('type'), `unknown type "${p.type}"`)
    else if (p.type !== expected) err('E1', p.rel, p.fieldLine('type'), `type "${p.type}" in ${p.folder}/ (expected "${expected}")`)

    // E2
    const seen = new Set()
    for (const e of p.edgeLines) {
      if (!schema.edges.includes(e.key)) err('E2', p.rel, e.line, `unknown edge key "${e.key}" (allowed: ${schema.edges.join(', ')})`)
      if (seen.has(e.key)) err('E2', p.rel, e.line, `duplicate edge key "${e.key}"`)
      if (!e.inline) err('E2', p.rel, e.line, `edge "${e.key}" must be an inline list: ${e.key}: [a, b]`)
      seen.add(e.key)
    }

    // E3, E4
    const keyLine = (key) => p.edgeLines.find((e) => e.key === key)?.line ?? 1
    for (const [key, targets] of Object.entries(p.edges)) {
      for (const t of targets) {
        const target = pages.get(t)
        if (!target) {
          err('E3', p.rel, keyLine(key), `edge ${key}: [${t}] does not resolve to a page`)
          continue
        }
        const want = [schema.edgeTargetType[key] ?? []].flat()
        if (want.length && !want.includes(target.type)) {
          err('E4', p.rel, keyLine(key), `${key}: [${t}] is a ${target.type} page; ${key} must point at a ${want.join(' or ')}`)
        }
      }
    }

    // E5
    for (const [key, inv] of Object.entries(schema.inverse)) {
      for (const [from, to] of [[key, inv], [inv, key]]) {
        for (const t of p.edges[from] ?? []) {
          const target = pages.get(t)
          if (!target || t === p.slug || (target.edges[to] ?? []).includes(p.slug)) continue
          missingInverses.push({ page: target, key: to, slug: p.slug })
          err('E5', target.rel, 1, `${p.slug} declares ${from}: [${t}] but ${t} is missing ${to}: [${p.slug}]`)
        }
      }
    }

    // E6, E7 on prose
    proseLines(p.body).forEach((line, i) => {
      const at = p.bodyOffset + i + 1
      for (const m of line.matchAll(/\[\[([^\]]+)\]\]/g)) {
        if (m[1].includes('#')) {
          err('E6', p.rel, at, `[[${m[1]}]] uses an anchor; link the page instead`)
          continue
        }
        const slug = m[1].split('|')[0].replace(/\\+$/, '').trim()
        if (!pages.has(slug)) err('E6', p.rel, at, `[[${slug}]] does not resolve to a page`)
      }
      for (const m of line.matchAll(/\]\(([^)#\s]+\.md)(#[^)]*)?\)/g)) {
        if (/^[a-z]+:/i.test(m[1])) continue
        if (!existsSync(resolve(root, dirname(p.rel), m[1]))) err('E7', p.rel, at, `link target missing: ${m[1]}`)
      }
    })
    for (const e of p.evidence) {
      if (!existsSync(join(root, e.path))) err('E7', p.rel, e.line, `evidence path missing: ${e.path}`)
    }
  }

  // E8 index
  const indexRel = 'wiki/index.md'
  if (!existsSync(join(root, indexRel))) {
    err('E8', indexRel, 1, 'wiki/index.md is missing')
  } else {
    const folderAlt = Object.keys(schema.folders).join('|')
    const rowRe = new RegExp(`\\((?:\\./)?((?:${folderAlt})/[^)]+\\.md)\\)`, 'g')
    const listed = new Map() // path -> { section, line }
    let section = null
    readFileSync(join(root, indexRel), 'utf8').split('\n').forEach((line, i) => {
      const h = line.match(/^##\s+(.+)$/)
      if (h) section = h[1].trim()
      for (const m of line.matchAll(rowRe)) listed.set(m[1], { section, line: i + 1 })
    })
    for (const p of pages.values()) {
      const path = `${p.folder}/${p.slug}.md`
      const row = listed.get(path)
      if (!row) err('E8', indexRel, 1, `page not listed: ${path}`)
      else if (row.section !== p.folder) err('E8', indexRel, row.line, `${path} sits under "## ${row.section}" (expected "## ${p.folder}")`)
    }
    for (const [path, row] of listed) {
      if (!existsSync(join(root, 'wiki', path))) err('E8', indexRel, row.line, `listed file missing: ${path}`)
    }
  }

  // E9, W4, W5 canon
  const canonRel = 'wiki/_canon.json'
  let canon = null
  try {
    canon = readJson(join(root, canonRel))
  } catch {
    err('E9', canonRel, 1, 'missing or not valid JSON')
  }
  if (canon) {
    const canonLines = readFileSync(join(root, canonRel), 'utf8').split('\n')
    const homeLine = (home) => canonLines.findIndex((l) => l.includes(`"${home}"`)) + 1 || 1
    for (const c of canon.concerns ?? []) {
      if (!existsSync(join(root, c.home))) err('E9', canonRel, homeLine(c.home), `concern "${c.concern}" home missing: ${c.home}`)
    }
    const offHome = canon.enforce_facts ? err : warn
    for (const fact of canon.facts ?? []) {
      if (!existsSync(join(root, fact.home))) err('E9', canonRel, homeLine(fact.home), `fact "${fact.id}" home missing: ${fact.home}`)
      const allowed = new Set(fact.allow ?? [])
      let onHome = false
      for (const p of pages.values()) {
        const lines = p.text.split('\n').map(normalizeFact)
        for (const pattern of fact.patterns ?? []) {
          const needle = normalizeFact(pattern)
          const hit = lines.findIndex((l) => factHit(l, needle))
          if (hit < 0) continue
          if (p.rel === fact.home) onHome = true
          else if (!allowed.has(p.rel)) offHome('E9', p.rel, hit + 1, `restates "${pattern}" (fact "${fact.id}" lives on ${fact.home})`)
        }
      }
      if (!onHome) warn('W5', fact.home, 1, `no pattern of fact "${fact.id}" appears on its home page`)
    }
    const exempt = new Set(schema.canonExempt ?? ['question', 'location', 'team'])
    for (const p of pages.values()) {
      if (exempt.has(p.type)) continue
      const covered = (canon.concerns ?? []).some((c) => c.home === p.rel || c.notes?.includes(p.slug))
      if (!covered) warn('W4', p.rel, 1, 'no concern row in wiki/_canon.json names this page')
    }
  }

  // E10 log
  const logRel = 'wiki/log.md'
  const kindsRel = 'wiki/_kinds.json'
  if (existsSync(join(root, logRel)) && existsSync(join(root, kindsRel))) {
    const declared = readJson(join(root, kindsRel)).kinds ?? {}
    const { entries, malformed } = parseLog(readFileSync(join(root, logRel), 'utf8'))
    for (const m of malformed) err('E10', logRel, m.line, `malformed heading; expected "## [YYYY-MM-DD] kind | title"`)
    const used = new Set()
    entries.forEach((e, i) => {
      used.add(e.kind)
      if (!declared[e.kind]) err('E10', logRel, e.line, `kind "${e.kind}" is not declared in ${kindsRel}`)
      if (i > 0 && e.date > entries[i - 1].date) err('E10', logRel, e.line, `${e.date} is newer than the entry above it; the log is newest-first`)
    })
    for (const kind of Object.keys(declared)) {
      if (!used.has(kind)) err('E10', kindsRel, 1, `kind "${kind}" is declared but never used`)
    }
  }

  // W1 orphans
  const inbound = new Set()
  for (const p of pages.values()) {
    for (const targets of Object.values(p.edges)) for (const t of targets) if (t !== p.slug) inbound.add(t)
    for (const line of proseLines(p.body)) {
      for (const m of line.matchAll(/\[\[([^\]|#]+)/g)) if (m[1].trim() !== p.slug) inbound.add(m[1].trim())
    }
  }
  for (const p of pages.values()) {
    if (!inbound.has(p.slug)) warn('W1', p.rel, 1, 'orphan: no edge or wikilink points here')
  }

  for (const p of pages.values()) {
    // W2
    const lines = p.body.split('\n').length
    const max = schema.softMaxLines[p.type]
    if (max && lines > max) warn('W2', p.rel, 1, `${lines} body lines (soft max ${max} for ${p.type})`)

    // W3
    if (p.type === 'question') {
      for (const name of ['status', 'horizon']) {
        const value = p.field(name)
        if (!value) warn('W3', p.rel, 1, `question missing ${name}:`)
        else if (!schema.question[name].includes(value)) warn('W3', p.rel, p.fieldLine(name), `${name} "${value}" is not one of ${schema.question[name].join(', ')}`)
      }
      const hasHypothesis = Boolean(p.field('hypothesis'))
      const hasEvidence = p.evidence.length > 0
      if (hasHypothesis !== hasEvidence) warn('W3', p.rel, 1, hasHypothesis ? 'hypothesis without evidence' : 'evidence without hypothesis')
    }

    // W6
    const verified = p.field('last-verified')
    if (verified) {
      const age = Math.floor((today - Date.parse(verified)) / 86400000)
      if (age > schema.staleDays) warn('W6', p.rel, p.fieldLine('last-verified'), `last-verified ${verified} is ${age} days old (limit ${schema.staleDays})`)
    }
  }

  findings.sort((a, b) => ORDER.indexOf(a.code) - ORDER.indexOf(b.code) || a.file.localeCompare(b.file) || a.line - b.line)
  return { findings, missingInverses, pageCount: pages.size }
}

// ---------- --fix ----------

export function addInverseEdges(root, missing) {
  const byFile = new Map()
  for (const m of missing) {
    const list = byFile.get(m.page.rel) ?? []
    list.push(m)
    byFile.set(m.page.rel, list)
  }
  for (const [rel, items] of byFile) {
    const path = join(root, rel)
    let text = readFileSync(path, 'utf8')
    for (const { key, slug } of items) {
      const fm = text.match(FRONTMATTER_RE)
      if (!fm) continue
      let block = fm[1]
      const inline = new RegExp(`^( {2}${key}:\\s*\\[)([^\\]]*)(\\])`, 'm')
      if (inline.test(block)) {
        block = block.replace(inline, (_, open, inner, close) => `${open}${inner.trim() ? `${inner}, ${slug}` : slug}${close}`)
      } else if (/^edges:\s*\{\s*\}\s*$/m.test(block)) {
        block = block.replace(/^edges:\s*\{\s*\}\s*$/m, `edges:\n  ${key}: [${slug}]`)
      } else if (/^edges:\s*$/m.test(block)) {
        block = block.replace(/^edges:\s*$/m, `edges:\n  ${key}: [${slug}]`)
      } else {
        block = `${block}\nedges:\n  ${key}: [${slug}]`
      }
      text = `---\n${block}\n---\n${text.slice(fm[0].length)}`
    }
    writeFileSync(path, text)
  }
  return byFile.size
}

// ---------- cli ----------

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const args = new Set(process.argv.slice(2))
  let result = lintWiki(root)
  if (args.has('--fix') && result.missingInverses.length) {
    const files = addInverseEdges(root, result.missingInverses)
    console.log(`--fix: added ${result.missingInverses.length} inverse edge(s) in ${files} file(s)\n`)
    result = lintWiki(root)
  }
  const { findings, pageCount } = result
  for (const f of findings) console.log(`${f.code} ${f.file}:${f.line} ${f.message}`)
  const errors = findings.filter((f) => f.severity === 'error').length
  const warnings = findings.length - errors
  console.log(`\nwiki-lint: ${pageCount} pages, ${errors} error(s), ${warnings} warning(s)`)
  process.exit(errors || (args.has('--strict-warns') && warnings) ? 1 : 0)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
