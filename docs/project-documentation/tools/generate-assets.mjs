import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import sharp from 'sharp'

// Documentation-only generator. Reads schema/type definitions; never contacts a database.
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = path.resolve(base, '../..')
const images = path.join(base, 'images')
await fs.mkdir(images, { recursive: true })

const color = {
  orange: '#FF6C40', ink: '#2C112B', muted: '#705C64', line: '#94798B',
  pale: '#FFF2EB', background: '#FFFFFF', white: '#FFFFFF', arrow: '#C36240',
}
const font = 'Noto Sans Armenian,Arial,sans-serif'
const mono = 'SFMono-Regular,Menlo,Consolas,monospace'
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const txt = (x, y, value, size = 18, options = {}) => `<text x="${x}" y="${y}" font-family="${options.code ? mono : font}" font-size="${size}" fill="${options.fill ?? color.ink}"${options.bold ? ' font-weight="600"' : ''}${options.anchor ? ` text-anchor="${options.anchor}"` : ''}>${xml(value)}</text>`
const rect = (x, y, width, height, options = {}) => {
  const accented = options.fill === color.pale
  const fill = accented ? 'url(#hatch-orange)' : options.fill ?? 'url(#hatch-plum)'
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${options.radius ?? 2}" fill="${fill}" stroke="${options.stroke ?? (accented ? color.orange : color.line)}" stroke-width="${options.strokeWidth ?? 2}"/>`
}
const line = (points, options = {}) => `<polyline points="${points.map(point => point.join(',')).join(' ')}" fill="none" stroke="${options.stroke ?? color.arrow}" stroke-width="${options.width ?? 2}" stroke-linejoin="round" stroke-linecap="round"${options.dashed ? ' stroke-dasharray="6 5"' : ''}${options.arrow === false ? '' : ' marker-end="url(#arrow)"'}/>`
function frame(width, height, title, subtitle, body) {
  // Keep the accessible description, but render only the diagram itself.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${xml(title)}"><title>${xml(title)}</title><desc>${xml(subtitle)}</desc><defs><pattern id="hatch-plum" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)"><rect width="8" height="8" fill="${color.white}"/><path d="M 1 0 V 8" stroke="${color.ink}" stroke-opacity="0.12" stroke-width="1" stroke-dasharray="1 2" stroke-linecap="round"/></pattern><pattern id="hatch-orange" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)"><rect width="8" height="8" fill="#FFFAF7"/><path d="M 1 0 V 8" stroke="${color.orange}" stroke-opacity="0.25" stroke-width="1.2" stroke-dasharray="1 2" stroke-linecap="round"/></pattern><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="${color.arrow}" stroke-width="1.7"/></marker></defs><rect width="${width}" height="${height}" fill="${color.background}"/><g id="diagram-content" transform="translate(0,-120)">${body}</g></svg>`
}
const manifest = []
async function save(name, title, subtitle, width, height, body) {
  const diagramHeight = height - 120
  const svg = frame(width, diagramHeight, title, subtitle, body)
  await fs.writeFile(path.join(images, `${name}.svg`), `${svg}\n`)
  await sharp(Buffer.from(svg), { density: 192 }).png().toFile(path.join(images, `${name}.png`))
  manifest.push({ name, title, width, height: diagramHeight, svg: `images/${name}.svg`, png: `images/${name}.png` })
}

// The generated application types provide the full current public-table column list.
// SQL-specific types, composite PKs and cross-schema FKs are verified against migrations.
const sourceText = await fs.readFile(path.join(root, 'database.types.ts'), 'utf8')
const source = ts.createSourceFile('database.types.ts', sourceText, ts.ScriptTarget.Latest, true)
const member = (node, name) => node.members.find(item => item.name?.getText(source).replaceAll('"', '') === name)?.type
const database = source.statements.find(item => ts.isTypeAliasDeclaration(item) && item.name.text === 'Database').type
const tablesNode = member(member(database, 'public'), 'Tables')
const literal = node => node.literal?.text ?? node.getText(source).replace(/^"|"$/g, '')
const purposes = {
  projects: 'Նախագծի ընդհանուր տվյալները', user_projects: 'Օգտատիրոջ անդամակցությունը նախագծին',
  roles: 'Նախագծի դերերը', user_roles: 'Օգտատիրոջը վերագրված դերերը',
  permissions: 'Գործողության և ռեսուրսի թույլտվությունները', role_permissions: 'Դերի թույլտվությունների կապը',
  schemas: 'Իրադարձության կառուցվածքի պայմանագիրը', fields: 'Սխեմայի դաշտերն ու կանոնները',
  events: 'Գրանցված կառուցվածքային իրադարձությունները', layouts: 'Վահանակի դասավորության նկարագրությունը',
  components: 'Դասավորության պատկերային բաղադրիչները', role_layouts: 'Դասավորության հասանելիությունը ըստ դերի',
  api_keys: 'Նախագծի արտաքին մուտքի բանալիները', invitations: 'Նախագծին միանալու հրավերները',
}
const compositePKs = { role_permissions: ['id', 'role_id', 'permission_id'], user_roles: ['id', 'user_id', 'role_id'] }
const sqlType = (table, column, type) => {
  if (column === 'id') return ['api_keys', 'events', 'layouts'].includes(table) ? 'bigint' : 'uuid'
  if (column === 'layout_id') return 'bigint'
  if (column.endsWith('_id') || column === 'invited_by' || column === 'token') return 'uuid'
  if (column.endsWith('_at')) return 'timestamptz'
  if (column === 'index') return 'smallint'
  if (type.includes('Json')) return 'json'
  if (type.includes('boolean')) return 'boolean'
  if (column === 'type') return table === 'fields' ? 'FieldTypes' : 'ComponentTypes'
  if (column === 'status' && ['schemas', 'fields'].includes(table)) return table === 'schemas' ? 'schema_status' : 'field_status'
  return 'text'
}
const tables = tablesNode.members.map(tableNode => {
  const name = tableNode.name.getText(source)
  const row = member(tableNode.type, 'Row')
  const columns = row.members.map(column => {
    const key = column.name.getText(source)
    return { name: key, type: sqlType(name, key, column.type.getText(source)), nullable: /\bnull\b/.test(column.type.getText(source)) }
  })
  const rel = member(tableNode.type, 'Relationships')
  const foreignKeys = rel.elements.map(element => ({
    column: literal(member(element, 'columns').elements[0]),
    table: literal(member(element, 'referencedRelation')),
    targetColumn: literal(member(element, 'referencedColumns').elements[0]),
  }))
  return { name, purpose: purposes[name], columns, primaryKey: compositePKs[name] ?? ['id'], foreignKeys }
})
const byName = new Map(tables.map(table => [table.name, table]))
for (const [table, column] of [['projects', 'creator_id'], ['user_projects', 'user_id'], ['user_roles', 'user_id'], ['invitations', 'invited_by']]) {
  byName.get(table).foreignKeys.push({ column, table: 'auth.users', targetColumn: 'id' })
}
const auth = {
  name: 'auth.users', purpose: 'Supabase Auth · կիրառվող դաշտերի հատված', primaryKey: ['id'], foreignKeys: [],
  columns: [{ name: 'id', type: 'uuid', nullable: false }, { name: 'email', type: 'varchar', nullable: true }, { name: 'raw_user_meta_data', type: 'jsonb', nullable: true }],
}
byName.set(auth.name, auth)
const uniqueness = {
  schemas: ['UNIQUE (project_id, key)'], fields: ['UNIQUE (schema_id, key)'],
  permissions: ['UNIQUE (action, subject)'], api_keys: ['UNIQUE INDEX (key_hash)', 'CHECK · hash / prefix'],
  role_layouts: ['UNIQUE (role_id, layout_id)'], invitations: ['UNIQUE (token)', "UNIQUE (project_id, email) · pending"],
}
const deletion = foreignKey => foreignKey.column === 'creator_id' ? 'RESTRICT' : foreignKey.column === 'role_id' && foreignKey.source === 'invitations' || foreignKey.column === 'schema_id' && foreignKey.source === 'components' ? 'SET NULL' : 'CASCADE'
const allEdges = tables.flatMap(table => table.foreignKeys.map(foreignKey => ({ source: table.name, ...foreignKey })))
for (const edge of allEdges) edge.onDelete = deletion(edge)
const functions = new Map()
for (const filename of (await fs.readdir(path.join(root, 'supabase/migrations'))).filter(name => name.endsWith('.sql')).sort()) {
  const sql = await fs.readFile(path.join(root, 'supabase/migrations', filename), 'utf8')
  for (const match of sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([\w.]+)\s*\(/gi)) {
    if (!match[1].startsWith('pg_temp.')) functions.set(match[1].replace(/^public\./, ''), filename)
  }
}
await fs.writeFile(path.join(images, 'database-structure.json'), `${JSON.stringify({ tables: [...tables, auth], foreignKeys: allEdges, functions: [...functions].map(([name, migration]) => ({ name, migration })) }, null, 2)}\n`)

function tableRows(table) {
  const isKey = name => table.primaryKey.includes(name) || table.foreignKeys.some(fk => fk.column === name)
  return [...table.columns].sort((a, b) => (a.name === 'id' ? -1 : b.name === 'id' ? 1 : Number(isKey(b.name)) - Number(isKey(a.name))))
}
for (const table of [...tables, auth]) {
  const rows = tableRows(table)
  const relations = allEdges.filter(edge => edge.source === table.name || edge.table === table.name)
  const notes = uniqueness[table.name] ?? []
  const tableHeight = 64 + rows.length * 29 + 36 + notes.length * 23
  const relationHeight = Math.max(120, relations.length * 66 - 10)
  const height = Math.max(tableHeight, relationHeight) + 190
  const tableY = 150 + (Math.max(tableHeight, relationHeight) - tableHeight) / 2
  const relationsY = 150 + (Math.max(tableHeight, relationHeight) - relationHeight) / 2
  let body = rect(40, tableY, 600, tableHeight)
  body += line([[40, tableY + 47], [640, tableY + 47]], { arrow: false, stroke: color.line, width: 1.5 })
  body += txt(60, tableY + 31, table.name, 24, { code: true, bold: true })
  rows.forEach((column, index) => {
    const y = tableY + 77 + index * 29
    const flags = [table.primaryKey.includes(column.name) ? 'PK' : '', table.foreignKeys.some(fk => fk.column === column.name) ? 'FK' : ''].filter(Boolean).join(' / ')
    body += txt(60, y, column.name, 18, { code: true })
    body += txt(350, y, column.type + (column.nullable ? ' ?' : ''), 17, { code: true, fill: color.muted })
    if (flags) body += txt(620, y, flags, 15, { anchor: 'end', fill: color.arrow, bold: true })
  })
  notes.forEach((note, index) => { body += txt(60, tableY + 82 + rows.length * 29 + index * 23, note, 16, { code: true, fill: color.arrow }) })
  relations.forEach((edge, index) => {
    const outgoing = edge.source === table.name
    const otherName = outgoing ? edge.table : edge.source
    const label = outgoing ? `${edge.column} → ${edge.targetColumn}` : `${edge.targetColumn} ← ${edge.column}`
    const y = relationsY + index * 66
    const nullable = byName.get(edge.source).columns.find(column => column.name === edge.column).nullable
    const mainColumn = outgoing ? edge.column : edge.targetColumn
    const mainY = tableY + 71 + rows.findIndex(column => column.name === mainColumn) * 29
    const laneX = 652 + index * 6
    const points = [[640, mainY], [laneX, mainY], [laneX, y + 25], [710, y + 25]]
    body += line(outgoing ? points : points.toReversed(), { dashed: nullable, width: 1.7 })
    body += rect(710, y, 350, 56, { fill: color.pale })
    body += txt(726, y + 23, otherName, 19, { code: true, bold: true })
    body += txt(726, y + 45, label, 15, { code: true, fill: color.muted })
  })
  await save(`table-${table.name.replace('.', '-')}`, table.name, table.purpose, 1100, height, body)
}

// Obstacle-aware orthogonal routing keeps the full FK map editable and readable.
class Heap {
  data = []
  push(value) { let index = this.data.length; this.data.push(value); while (index) { const parent = (index - 1) >> 1; if (this.data[parent].score <= value.score) break; this.data[index] = this.data[parent]; index = parent } this.data[index] = value }
  pop() { const first = this.data[0]; const last = this.data.pop(); if (this.data.length) { let index = 0; while (index * 2 + 1 < this.data.length) { let next = index * 2 + 1; if (next + 1 < this.data.length && this.data[next + 1].score < this.data[next].score) next++; if (last.score <= this.data[next].score) break; this.data[index] = this.data[next]; index = next } this.data[index] = last } return first }
}
const overviewPositions = {
  'auth.users': [60, 180], projects: [460, 180], api_keys: [860, 180], invitations: [1260, 180],
  user_projects: [60, 450], roles: [460, 450], schemas: [860, 450], layouts: [1260, 450],
  user_roles: [60, 720], role_permissions: [460, 720], fields: [860, 720], components: [1260, 720],
  permissions: [460, 990], events: [860, 990], role_layouts: [1260, 990],
}
const overviewRects = Object.entries(overviewPositions).map(([name, [x, y]]) => ({ name, x, y, width: 270, height: 170 }))
const occupied = new Map()
function routeEdge(edge) {
  const a = overviewRects.find(item => item.name === edge.source)
  const b = overviewRects.find(item => item.name === edge.table)
  const dx = b.x - a.x, dy = b.y - a.y
  const side = Math.abs(dx) >= Math.abs(dy) ? dx >= 0 ? 'right' : 'left' : dy >= 0 ? 'bottom' : 'top'
  const opposite = { right: 'left', left: 'right', bottom: 'top', top: 'bottom' }
  const anchor = (box, which, outside = 0) => which === 'left' ? [box.x - outside, box.y + 80] : which === 'right' ? [box.x + box.width + outside, box.y + 80] : which === 'top' ? [box.x + 130, box.y - outside] : [box.x + 130, box.y + box.height + outside]
  const startPoint = anchor(a, side), endPoint = anchor(b, opposite[side])
  const start = anchor(a, side, 20).map(value => Math.round(value / 10))
  const goal = anchor(b, opposite[side], 20).map(value => Math.round(value / 10))
  const key = (x, y, direction) => `${x},${y},${direction}`
  const cell = (x, y) => `${x},${y}`
  const blocked = (x, y) => overviewRects.some(box => x * 10 > box.x - 10 && x * 10 < box.x + box.width + 10 && y * 10 > box.y - 10 && y * 10 < box.y + box.height + 10)
  const queue = new Heap(), distances = new Map(), previous = new Map()
  const initial = { x: start[0], y: start[1], direction: -1, distance: 0, score: 0 }
  queue.push(initial)
  distances.set(key(initial.x, initial.y, -1), 0)
  let finish
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]]
  while (queue.data.length) {
    const current = queue.pop()
    if (current.distance !== distances.get(key(current.x, current.y, current.direction))) continue
    if (current.x === goal[0] && current.y === goal[1]) { finish = current; break }
    directions.forEach(([moveX, moveY], direction) => {
      const x = current.x + moveX, y = current.y + moveY
      if (x < 2 || x > 157 || y < 14 || y > 122 || blocked(x, y)) return
      const distance = current.distance + 1 + (current.direction !== direction && current.direction !== -1 ? 0.9 : 0) + (occupied.get(cell(x, y)) ?? 0) * 0.7
      const id = key(x, y, direction)
      if (distance >= (distances.get(id) ?? Infinity)) return
      distances.set(id, distance)
      previous.set(id, current)
      queue.push({ x, y, direction, distance, score: distance + Math.abs(x - goal[0]) + Math.abs(y - goal[1]) })
    })
  }
  if (!finish) throw new Error(`Unable to route ${edge.source}.${edge.column}`)
  const points = []
  for (let current = finish; current; current = previous.get(key(current.x, current.y, current.direction))) {
    points.push([current.x * 10, current.y * 10])
    occupied.set(cell(current.x, current.y), (occupied.get(cell(current.x, current.y)) ?? 0) + 1)
  }
  points.reverse()
  const compressed = [startPoint, points[0]]
  for (let index = 1; index < points.length - 1; index++) {
    if ((points[index][0] - points[index - 1][0]) * (points[index + 1][1] - points[index][1]) !== (points[index][1] - points[index - 1][1]) * (points[index + 1][0] - points[index][0])) compressed.push(points[index])
  }
  compressed.push(points.at(-1), endPoint)
  return compressed
}
let overview = ''
for (const edge of [...allEdges].sort((a, b) => {
  const distance = item => Math.abs(overviewPositions[item.source][0] - overviewPositions[item.table][0]) + Math.abs(overviewPositions[item.source][1] - overviewPositions[item.table][1])
  return distance(a) - distance(b)
})) {
  const points = routeEdge(edge)
  const nullable = byName.get(edge.source).columns.find(column => column.name === edge.column).nullable
  overview += line(points, { stroke: color.background, width: 7, arrow: false })
  overview += line(points, { dashed: nullable, width: 1.8 })
}
for (const box of overviewRects) {
  const table = byName.get(box.name)
  const keys = tableRows(table).filter(column => table.primaryKey.includes(column.name) || table.foreignKeys.some(fk => fk.column === column.name))
  overview += rect(box.x, box.y, box.width, box.height)
  overview += line([[box.x, box.y + 44], [box.x + box.width, box.y + 44]], { arrow: false, stroke: color.line, width: 1.5 })
  overview += txt(box.x + 15, box.y + 29, box.name, 21, { code: true, bold: true })
  keys.forEach((column, index) => {
    const flags = [table.primaryKey.includes(column.name) ? 'PK' : '', table.foreignKeys.some(fk => fk.column === column.name) ? 'FK' : ''].filter(Boolean).join('/')
    overview += txt(box.x + 15, box.y + 73 + index * 23, `${column.name}${column.nullable ? ' ?' : ''} · ${flags}`, 16, { code: true, fill: color.muted })
  })
  overview += txt(box.x + box.width - 14, box.y + box.height - 12, `${table.columns.length} դաշտ${box.name === 'auth.users' ? ' · հատված' : ''}`, 13, { anchor: 'end', fill: color.muted })
}
await save('database-overview', 'Տվյալների բազայի աղյուսակներն ու կապերը', 'Ընդհանուր քարտեզում՝ բանալիները, առանձին պատկերներում՝ յուրաքանչյուր աղյուսակի բոլոր դաշտերը։', 1600, 1200, overview)

function card(x, y, title, lines, width = 330, height = 135) {
  return rect(x, y, width, height, { fill: color.pale }) + txt(x + width / 2, y + 42, title, 22, { bold: true, anchor: 'middle' }) + lines.map((value, index) => txt(x + width / 2, y + 77 + index * 27, value, 18, { fill: color.muted, anchor: 'middle' })).join('')
}
async function sequence(name, title, subtitle, steps) {
  const rows = Math.ceil(steps.length / 3), width = 1160, height = 155 + (rows - 1) * 205 + 135 + 40
  let body = ''
  const positions = steps.map((_, index) => {
    const row = Math.floor(index / 3), column = row % 2 ? 2 - index % 3 : index % 3
    return [40 + column * 375, 155 + row * 205]
  })
  for (let index = 0; index < positions.length - 1; index++) {
    const [x, y] = positions[index], [nextX, nextY] = positions[index + 1]
    body += y === nextY ? line([[x + (nextX > x ? 330 : 0), y + 70], [nextX + (nextX > x ? 0 : 330), nextY + 70]]) : line([[x + 165, y + 135], [x + 165, nextY]])
  }
  steps.forEach((step, index) => { body += card(...positions[index], `${index + 1}. ${step[0]}`, step.slice(1)) })
  await save(name, title, subtitle, width, height, body)
}

let body = card(40, 165, 'User Interface', ['React · TypeScript', 'Օգտատիրոջ ինտերֆեյս'])
body += card(440, 165, 'Next.js API', ['Route handlers · ստուգում', 'Օգտատեր կամ API key'])
body += card(840, 165, 'Supabase', ['Auth · PostgreSQL', 'RLS · SQL RPC · triggers'])
body += card(40, 390, 'Python SDK', ['Pydantic տիպեր', 'httpx · Bearer բանալի'])
body += card(840, 390, 'SQL միգրացիաներ', ['Աղյուսակներ և կապեր', 'Կանոններ ու ֆունկցիաներ'])
body += line([[370, 230], [440, 230]]) + line([[770, 230], [840, 230]])
body += line([[370, 455], [410, 455], [410, 270], [440, 270]])
body += line([[1005, 390], [1005, 300]])
body += txt(445, 421, 'Հանրային SDK մուտքեր', 20, { bold: true })
body += txt(445, 458, '/api/sdk/schemas', 18, { code: true })
body += txt(445, 487, 'POST /api/events', 18, { code: true })
await save('system-architecture', 'Hotlog համակարգի ընդհանուր ճարտարապետությունը', 'Վեբ միջերեսն ու արտաքին հավելվածները միավորվում են ընդհանուր տվյալների պայմանագրով։', 1210, 575, body)

await sequence('frontend-architecture', 'FrontEnd շերտերի բաժանումը', 'Էջից մինչև սերվերային տվյալների կառավարում՝ հստակ պատասխանատվություններ։', [
  ['Էջ և երթուղի', 'Վեբ և API ուղղություններ', 'Լեզու և նավարկում'],
  ['Ֆունկցիոնալ մոդուլ', 'Ներկայացում և վարքագիծ', 'Հստակ պատասխանատվություն'],
  ['Համօգտագործվող UI', 'Tailwind · Radix', 'Ձևեր և պատկերային տարրեր'],
  ['Հարցման վիճակ', 'React Query', 'Բեռնում և քեշավորում'],
  ['Տիպավորված API', 'Հարցման պայմանագիր', 'Ընդհանուր HTTP հաճախորդ'],
  ['HTTP շերտ', 'API հարցման մշակում', 'JSON պատասխան'],
])

await sequence('data-request-flow', 'Վեբ հարցման և պատասխանի ճանապարհը', 'Վեբ հարցման նույնականացումը պահպանում է օգտատիրոջ Supabase նստաշրջանը։', [
  ['Գործողություն', 'Էջ · ձև · կոճակ', 'Hook / service'],
  ['Տիպավորված HTTP', 'shared/api · ky', 'Հարցման տվյալներ'],
  ['Route handler', 'Մուտքի տվյալների ստուգում', 'Supabase server client'],
  ['Տվյալների սահման', 'RLS · SQL RPC', 'Constraint · trigger'],
  ['JSON պատասխան', 'Տվյալներ կամ սխալ', 'snake_case → camelCase'],
  ['Միջերեսի թարմացում', 'Cache-ի թարմացում', 'Սխալի դեպքում՝ rollback'],
])

await sequence('migrations-contract', 'Հավելվածի և Supabase-ի պայմանագրի զարգացումը', 'Միգրացիաները փոխում են տվյալների կառուցվածքն ու վարքագիծը՝ սահմանված հերթականությամբ։', [
  ['SQL միգրացիա', 'DDL · սահմանափակումներ', 'RLS · SQL ֆունկցիաներ'],
  ['PostgreSQL կառուցվածք', 'Աղյուսակներ և կապեր', 'Գրառման ստուգման կանոններ'],
  ['TypeScript տիպեր', 'database.types.ts', 'Տիպերի վերագեներացում'],
  ['API-ի պայմանագիր', 'API route · interface', 'Հարցում և պատասխան'],
  ['Միջերեսի վիճակ', 'React Query cache', 'Վիճակի համաձայնեցում'],
  ['Վարքագծի ստուգում', 'Route և SQL թեստեր', 'Պայմանագրի պահպանում'],
])

await sequence('sdk-flow', 'Python SDK-ի տիպավորված ինտեգրումը', 'Նախագծի սխեմայից մինչև ընդունված իրադարձություն՝ մեկ համահունչ շղթա։', [
  ['Սխեմայի սահմանում', 'key · դաշտեր · տիպեր', 'Պարտադիրություն և metadata'],
  ['Սխեմաների ընթերցում', 'GET /api/sdk/schemas', 'Bearer API key'],
  ['Տիպերի գեներացում', 'hotlog generate', 'hotlog_types.py · Pydantic'],
  ['Տիպավորված գրառում', 'Event ենթադաս', 'Տեղային տիպային ստուգում'],
  ['Ուղարկում', 'POST /api/events', 'schema_key + value'],
  ['Վերջնական ստուգում', 'API + PostgreSQL trigger', '201 · id · createdAt'],
])

await sequence('security-access', 'Հասանելիության ստուգման շերտերը', 'Նստաշրջանը հաստատում է ինքնությունը, իսկ անդամակցությունն ու կանոնները՝ իրավասությունը։', [
  ['Ինքնություն', 'Supabase Auth', 'auth.uid()'],
  ['Անդամակցություն', 'user_projects', 'Իրավասության նախապայման'],
  ['Դեր և թույլտվություն', 'user_roles · roles', 'role_permissions'],
  ['Իրավասություն', 'has_permission(...)', 'action + subject / all'],
  ['Տվյալների սահման', 'RLS + նպատակային RPC', 'Տողերի և գրառումների ստուգում'],
  ['Թույլատրելի արդյունք', 'Տվյալ կամ գործողություն', 'UI-ն արտացոլում է իրավունքը'],
])

await sequence('invitations-flow', 'Հրավերով նախագծին միանալու ընթացքը', 'Հրավերը կապում է նախագիծը, հասցեատիրոջ էլփոստը և ընտրովի դերը։', [
  ['Հրավերի ստեղծում', 'create:users իրավասություն', 'email · project · role'],
  ['Հրավերի հղում', 'token · pending', 'Սահմանված expires_at'],
  ['Օգտատիրոջ մուտք', 'Supabase Auth', 'Հղման token-ի փոխանցում'],
  ['Հրավերի ստուգում', 'Վիճակ · ժամկետ · email', 'accept_invitation(...)'],
  ['Անդամակցություն', 'user_projects', 'Ընտրովի՝ user_roles'],
  ['Հրավերի ընդունում', 'status = accepted', 'Նախագծի բացում'],
])

await sequence('event-lifecycle', 'Իրադարձության ընդունման և ընթերցման ընթացքը', 'Կառուցվածքային տվյալները ընդունվում են նախագծի ակտիվ սխեմայի շրջանակում։', [
  ['HTTP հարցում', 'Bearer key · JSON', 'Ծավալ և կառուցվածք'],
  ['Բանալի և սխեմա', 'Hash-ի համեմատում', 'Նախագծի ակտիվ սխեմա'],
  ['API ստուգում', 'Ակտիվ դաշտեր', 'Տիպեր և metadata'],
  ['Գրառման ստուգում', 'ingest_event + trigger', 'Սխեմայի համատեղ lock'],
  ['Պահպանում', 'events · key usage audit', 'Սխալի դեպքում՝ rollback'],
  ['Թույլատրելի ընթերցում', '/api/project/events', 'Ֆիլտրեր · էջավորում'],
])

body = card(40, 160, 'Սխեմայի նույնականացում', ['schemas.key', 'API-ն պահպանում է կայունությունը'], 510)
body += card(630, 160, 'Դաշտի նույնականացում', ['fields.key + fields.type', 'API-ն չի թույլատրում փոխել'], 510)
body += card(40, 380, 'Խմբագրվող նկարագրություն', ['display_name · metadata', 'required · կիրառվող կանոններ'], 510)
body += card(630, 380, 'Արխիվացում և վերականգնում', ['active ↔ archived', 'Պատմական գրառումները պահվում են'], 510)
body += line([[295, 295], [295, 380]]) + line([[885, 295], [885, 380]])
await save('schema-contract', 'Կայուն պայմանագիր և խմբագրվող ներկայացում', 'Սխեմայի կամ դաշտի անվան փոփոխությունը չի փոխում իրադարձության տեխնիկական բանալին։', 1180, 555, body)

body = rect(40, 160, 720, 365) + txt(65, 198, 'layouts', 24, { code: true, bold: true })
body += rect(65, 220, 670, 90, { fill: color.pale }) + txt(85, 252, 'components · span = full', 21, { code: true }) + txt(85, 285, 'visualization · index · inputs_ids', 18, { code: true, fill: color.muted })
body += rect(65, 330, 325, 150, { fill: color.pale }) + txt(85, 365, 'span = half', 21, { code: true }) + txt(85, 400, 'schema_id', 18, { code: true }) + txt(85, 433, 'bindings → fieldKey', 17, { code: true, fill: color.muted })
body += rect(410, 330, 325, 150, { fill: color.pale }) + txt(430, 365, 'span = half', 21, { code: true }) + txt(430, 400, 'visualization', 18, { code: true }) + txt(430, 433, 'index → հերթականություն', 17, { fill: color.muted })
body += card(825, 160, 'Տեղային խմբագրում', ['Ավելացնել · փոխել · ջնջել', 'Save / Cancel'], 335)
body += card(825, 390, 'Ատոմային գրառում', ['batch_layout_components', 'Մեկ տրանզակցիա'], 335)
body += line([[992, 295], [992, 390]])
await save('layout-composition', 'Դասավորության և բաղադրիչների կառուցվածքը', 'Կարգավորումը պահպանում է տեղադրությունը, պատկերավորման տեսակը և դաշտերի կապակցումը։', 1200, 565, body)

await sequence('frontend-user-flow', 'Օգտատիրոջ հիմնական աշխատանքային սցենարը', 'Նախագծի ընտրությունը սահմանում է էջերի և գործողությունների համատեքստը։', [
  ['Մուտք և նախագիծ', 'Նույնականացում', 'Ընտրություն կամ ստեղծում'],
  ['Սխեմա և դաշտեր', 'Կառուցվածքի սահմանում', 'Ձևի ստուգում'],
  ['Ինտեգրում', 'API key · SDK տիպեր', 'Բանալու միանվագ ցուցադրում'],
  ['Իրադարձություններ', 'Սխեմայի ֆիլտր', 'Էջավորում · գրառման տվյալներ'],
  ['Վահանակի խմբագրում', 'Բաղադրիչներ և կապակցումներ', 'Չափ · դիրք · Save / Cancel'],
  ['Թիմ և կարգավորումներ', 'Դերեր · հրավերներ', 'Լեզու · թեմա · հաշիվ'],
])

await fs.writeFile(path.join(images, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Created ${manifest.length} SVG diagrams and ${manifest.length} PNG images in ${images}`)
console.log(`Schema inventory: ${tables.length} public tables, ${allEdges.length} foreign keys, ${functions.size} application functions`)
