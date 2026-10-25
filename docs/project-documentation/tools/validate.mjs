import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = path.resolve(base, '../..')
const chapters = ['01-introduction.md', '02-problem-statement.md', '03-frontend.md', '04-backend.md', '05-database.md', '06-frontend-backend.md', '08-conclusion.md']
const functionality = ['07-web-design-frontend.md', '07-backend-sdk.md', '07-backend-security.md', '07-backend-events-schemas-layouts.md']
const versions = ['01-web-design-frontend.md', '02-backend-sdk.md', '03-backend-security.md', '04-backend-events-schemas-layouts.md']
const sourcePaths = [...chapters.map(name => `chapters/${name}`), ...functionality.map(name => `functionality/${name}`)]
const markdownPaths = ['README.md', ...sourcePaths, ...versions.map(name => `versions/${name}`)]
const allText = new Map()
let checkedLinks = 0, checkedSnippets = 0, checkedCaptions = 0
for (const relative of markdownPaths) {
  const filename = path.join(base, relative)
  const content = await fs.readFile(filename, 'utf8')
  allText.set(relative, content)
  assert(content.trim().length > 100, `Empty content: ${relative}`)
  assert(!/[\uFFFD]/u.test(content), `Invalid Unicode in ${relative}`)
  assert(!/\u2014/u.test(content), `Em dash in ${relative}`)
  let fence = null, chapter = null, imageIndex = 0
  const rows = content.split('\n')
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]
    const match = row.match(/^\s*(`{3,}|~{3,})(.*)$/)
    if (match) {
      if (!fence) fence = match[1][0]
      else if (match[1][0] === fence) { fence = null; checkedSnippets++ }
      continue
    }
    if (fence) continue
    assert(!/^#{2,6}\s+\d+(?:\.\d+)*\.?(?:\s|$)/u.test(row), `Numbered subheading: ${relative}:${index + 1}`)
    const heading = row.match(/^# ([1-8])\. /)
    if (heading) { chapter = Number(heading[1]); imageIndex = 0 }
    const image = row.match(/^!\[[^\]]*\]\(([^)]+)\)$/)
    if (!image) continue
    let captionLine = index + 1
    while (rows[captionLine]?.trim() === '') captionLine++
    const caption = rows[captionLine]?.trim().match(/^\*Նկար ([1-8])\.([1-9]\d*) - ([^*]+)\*$/u)
    assert(caption, `Missing numbered image caption: ${relative}:${index + 1}`)
    assert(caption[3].length <= 80 && !caption[3].includes('։'), `Image caption must be a short label: ${relative}:${captionLine + 1}`)
    const number = [Number(caption[1]), Number(caption[2])]
    if (relative === 'README.md') {
      const references = { 'system-architecture.png': [1, 1], 'database-overview.png': [5, 1] }
      assert.deepEqual(number, references[path.basename(image[1])], `Wrong README figure reference: ${image[1]}`)
    } else {
      assert.notEqual(chapter, null, `Image outside a numbered chapter: ${relative}`)
      assert.deepEqual(number, [chapter, ++imageIndex], `Wrong image sequence: ${relative}:${captionLine + 1}`)
    }
    checkedCaptions++
  }
  assert.equal(fence, null, `Unclosed code fence: ${relative}`)
  for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().split(/\s+"/)[0]
    if (/^(https?:|mailto:|#)/.test(target)) continue
    const resolved = path.resolve(path.dirname(filename), decodeURIComponent(target.split('#')[0]))
    assert(resolved.startsWith(`${base}${path.sep}`), `Link escapes documentation: ${relative} -> ${target}`)
    await fs.access(resolved)
    checkedLinks++
  }
  if (relative !== 'README.md') {
    assert(/[Ա-Ֆա-ֆ]/u.test(content), `Missing Armenian content: ${relative}`)
    assert(!/\b(?:mock(?:ed|ing)?|production|deployment|TODO|TBD)\b|\bdev\s+branch\b/iu.test(content), `Excluded status or placeholder wording: ${relative}`)
  }
}
const frontendChapter = allText.get('chapters/03-frontend.md').trim()
assert(!/\bsrc\/|\.tsx?\b|\*\.(?:component|service)|\[locale\]/u.test(frontendChapter), 'Frontend prose must describe responsibilities, not implementation file names')
for (const filename of versions) {
  const content = allText.get(`versions/${filename}`)
  const numbers = [...content.matchAll(/^# ([1-8])\. /gm)].map(match => Number(match[1]))
  assert.deepEqual(numbers, [1, 2, 3, 4, 5, 6, 7, 8], `Wrong chapter order: ${filename}`)
  assert(content.includes(frontendChapter), `Outdated frontend chapter: ${filename}`)
}
const variantTexts = functionality.map(name => allText.get(`functionality/${name}`))
assert.equal(new Set(variantTexts).size, 4, 'Functionality variants must differ')

const structure = JSON.parse(await fs.readFile(path.join(base, 'images/database-structure.json'), 'utf8'))
const publicTables = structure.tables.filter(table => table.name !== 'auth.users')
assert.equal(publicTables.length, 14)
assert.equal(structure.foreignKeys.length, 21)
assert.equal(structure.functions.length, 30)
const databaseText = allText.get('chapters/05-database.md')
for (const table of structure.tables) {
  assert(databaseText.includes(table.name), `Missing table description: ${table.name}`)
  assert(databaseText.includes(`table-${table.name.replace('.', '-')}.png`), `Missing per-table figure: ${table.name}`)
}
const functions = new Set()
for (const filename of (await fs.readdir(path.join(root, 'supabase/migrations'))).filter(name => name.endsWith('.sql'))) {
  const sql = await fs.readFile(path.join(root, 'supabase/migrations', filename), 'utf8')
  for (const match of sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([\w.]+)\s*\(/gi)) {
    if (!match[1].startsWith('pg_temp.')) functions.add(match[1].replace(/^public\./, ''))
  }
}
assert.equal(functions.size, structure.functions.length)
for (const name of functions) assert(databaseText.includes(name), `Missing database function: ${name}`)
const keyColumns = publicTables.find(table => table.name === 'api_keys').columns.map(column => column.name)
assert(!keyColumns.includes('key'), 'Plaintext API key column must not appear in final structure')
for (const name of ['key_hash', 'key_prefix', 'last_used_at', 'revoked_at']) assert(keyColumns.includes(name))

const figures = JSON.parse(await fs.readFile(path.join(base, 'images/manifest.json'), 'utf8'))
assert.equal(figures.length, 27)
for (const figure of figures) {
  const svg = await fs.readFile(path.join(base, figure.svg), 'utf8')
  assert(svg.includes('<title>') && svg.includes('<desc>'), `Missing accessible SVG metadata: ${figure.name}`)
  const diagram = svg.match(/<g id="diagram-content" transform="translate\(0,-120\)">([\s\S]*)<\/g>/)
  assert(diagram, `Missing diagram-only frame: ${figure.name}`)
  assert(!/<text\b/.test(svg.replace(diagram[0], '')), `Visible external header: ${figure.name}`)
  assert(!/PK՝|FK՝|սլաք՝|nullable FK/u.test(diagram[1]), `Explanatory footer in ${figure.name}`)
  assert(svg.includes('id="hatch-plum"') && svg.includes('id="hatch-orange"'), `Missing drawing-style hatching: ${figure.name}`)
  for (const match of diagram[1].matchAll(/<rect\s+([^>]+)\/>/g)) {
    const attributes = Object.fromEntries([...match[1].matchAll(/(x|y|width|height)="([^"]+)"/g)].map(value => [value[1], Number(value[2])]))
    assert(attributes.x >= 0 && attributes.x + attributes.width <= figure.width, `Horizontally clipped shape: ${figure.name}`)
    assert(attributes.y - 120 >= 0 && attributes.y + attributes.height - 120 <= figure.height, `Vertically clipped shape: ${figure.name}`)
  }
  for (const match of diagram[1].matchAll(/<polyline points="([^"]+)"/g)) {
    for (const point of match[1].split(' ')) {
      const [x, y] = point.split(',').map(Number)
      assert(x >= 0 && x <= figure.width && y - 120 >= 0 && y - 120 <= figure.height, `Clipped connector: ${figure.name}`)
    }
  }
  const image = await sharp(path.join(base, figure.png)).metadata()
  assert.equal(image.format, 'png')
  assert(image.width >= figure.width * 2 && image.height >= figure.height * 2, `Low-resolution image: ${figure.name}`)
}
for (const directory of ['tools', 'images']) {
  for (const filename of await fs.readdir(path.join(base, directory))) {
    if (!/\.(?:mjs|json|svg)$/.test(filename)) continue
    const content = await fs.readFile(path.join(base, directory, filename), 'utf8')
    assert(!/\u2014/u.test(content), `Em dash in ${directory}/${filename}`)
  }
}
const wordCount = content => (content.match(/[\p{L}\p{N}_]+(?:['’.-][\p{L}\p{N}_]+)*/gu) ?? []).length
console.log(`PASS: ${markdownPaths.length} Markdown files; ${checkedLinks} local links; ${checkedSnippets} fenced snippets; ${checkedCaptions} numbered image captions; ${figures.length} SVG/PNG pairs`)
console.log(`PASS: ${publicTables.length} public tables + auth.users; ${structure.foreignKeys.length} foreign keys; ${functions.size} persistent functions`)
for (const filename of versions) console.log(`${filename}: ${wordCount(allText.get(`versions/${filename}`))} words`)
