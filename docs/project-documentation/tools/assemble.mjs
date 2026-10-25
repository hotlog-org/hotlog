import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Assemble Markdown only. This tool does not generate Word/PDF or contact services.
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const common = [
  ['01-introduction.md', 'Ներածություն'],
  ['02-problem-statement.md', 'Խնդրի դրվածք'],
  ['03-frontend.md', 'FrontEnd'],
  ['04-backend.md', 'BackEnd'],
  ['05-database.md', 'Տվյալների բազայի նկարագրություն և կապեր'],
  ['06-frontend-backend.md', 'FrontEnd և BackEnd փոխհամագործակցություն'],
]
const variants = [
  ['01-web-design-frontend.md', '07-web-design-frontend.md', 'Վեբ դիզայն և FrontEnd'],
  ['02-backend-sdk.md', '07-backend-sdk.md', 'BackEnd և Python SDK'],
  ['03-backend-security.md', '07-backend-security.md', 'BackEnd անվտանգություն, դերեր և հրավերներ'],
  ['04-backend-events-schemas-layouts.md', '07-backend-events-schemas-layouts.md', 'BackEnd՝ իրադարձություններ, սխեմաներ և դասավորություններ'],
]
const chapterTexts = await Promise.all(common.map(([file]) => fs.readFile(path.join(base, 'chapters', file), 'utf8')))
const conclusion = await fs.readFile(path.join(base, 'chapters/08-conclusion.md'), 'utf8')
await fs.mkdir(path.join(base, 'versions'), { recursive: true })
const statistics = []
const wordCount = value => (value.match(/[\p{L}\p{N}_]+(?:['’.-][\p{L}\p{N}_]+)*/gu) ?? []).length
for (const [filename, functionality, title] of variants) {
  const content = await fs.readFile(path.join(base, 'functionality', functionality), 'utf8')
  const toc = [...common.map(([, heading]) => heading), 'Համակարգի ֆունկցիոնալություն', 'Եզրակացություն'].map((heading, index) => `${index + 1}. ${heading}`).join('\n')
  const assembled = `# Hotlog\n\nՆախագծի նկարագրություն\n\n**Ուղղություն՝ ${title}**\n\n## Բովանդակություն\n\n${toc}\n\n---\n\n${[...chapterTexts, content, conclusion].map(chapter => chapter.trim()).join('\n\n---\n\n')}\n`
  await fs.writeFile(path.join(base, 'versions', filename), assembled)
  statistics.push({ filename, title, words: wordCount(assembled), functionalityWords: wordCount(content) })
}

const images = JSON.parse(await fs.readFile(path.join(base, 'images/manifest.json'), 'utf8'))
const tableNames = ['auth-users', 'projects', 'user_projects', 'roles', 'user_roles', 'permissions', 'role_permissions', 'schemas', 'fields', 'events', 'layouts', 'components', 'role_layouts', 'api_keys', 'invitations']
const readme = [
  '# Hotlog - նախագծի հայերեն նկարագրություն',
  '',
  'Փաթեթը պարունակում է բոլոր ութ թեմաների պատրաստի Markdown բովանդակությունը, «Համակարգի ֆունկցիոնալություն» բաժնի չորս ինքնուրույն տարբերակ և համապատասխան դիագրամները։ Word փաստաթղթեր չեն ստեղծվում։',
  '',
  '## Ամբողջական տարբերակներ',
  '',
  'Ստորև յուրաքանչյուր ֆայլ արդեն ներառում է բոլոր ութ բաժինները՝ ճիշտ հերթականությամբ։ Առաջին վեց բաժիններն ու եզրակացությունն ընդհանուր են, իսկ յոթերորդ բաժինը ներկայացնում է տվյալ ուղղությունը։ Տարբերակների ծավալները միտումնավոր չեն հավասարեցված։',
  '',
  '| Ուղղություն | Պատրաստի ամբողջական Markdown |',
  '| --- | --- |',
  ...variants.map(([filename, , title]) => `| ${title} | [Բացել](versions/${filename}) |`),
  '',
  '## Բաժիններն առանձին',
  '',
  ...common.map(([filename, title], index) => `${index + 1}. [${title}](chapters/${filename})`),
  '7. Համակարգի ֆունկցիոնալություն՝ ստորև նշված չորս տարբերակներից մեկը։',
  '8. [Եզրակացություն](chapters/08-conclusion.md)',
  '',
  '### «Համակարգի ֆունկցիոնալություն» բաժնի ուղղությունները',
  '',
  ...variants.map(([, functionality, title]) => `- [${title}](functionality/${functionality})`),
  '',
  '## Ճարտարապետական պատկերներ',
  '',
  'Դիագրամները տեղադրված են համապատասխան բաժիններում՝ հայերեն բացատրությունների և վերնագրերի կողքին։ Ձևավորումը `tldraw`-ին մոտ է՝ բաց ֆոնով, պարզ եզրագծերով, թեթև շտրիխավորմամբ և կայքի նարնջագույն `#FF6C40` ու մուգ մանուշակագույն `#2C112B` գույներով։ Նկարները պարունակում են միայն բուն դիագրամը՝ առանց արտաքին վերնագրերի կամ բացատրական ստորագրությունների։',
  '',
  '![Hotlog համակարգի ընդհանուր ճարտարապետությունը](images/system-architecture.png)',
  '',
  '*Նկար 1.1 - համակարգի ճարտարապետություն*',
  '',
  '### Տվյալների բազայի ընդհանուր քարտեզ',
  '',
  '![Տվյալների բազայի աղյուսակներն ու արտաքին բանալիները](images/database-overview.png)',
  '',
  '*Նկար 5.1 - տվյալների մոդել*',
  '',
  '### Յուրաքանչյուր աղյուսակի պատկերը',
  '',
  '| Աղյուսակ | Պատկեր |',
  '| --- | --- |',
  ...tableNames.map(name => `| \`${name === 'auth-users' ? 'auth.users' : name}\` | [PNG](images/table-${name}.png) · [SVG](images/table-${name}.svg) |`),
  '',
  'Պատկերներում `PK`-ն հիմնական բանալին է, `FK`-ն՝ արտաքին բանալին, իսկ `?`-ը ցույց է տալիս թույլատրելի `NULL` արժեքը։ Սլաքը գնում է արտաքին բանալի պարունակող աղյուսակից դեպի ծնող աղյուսակը՝ `N → 1`։ Բաղադրյալ հիմնական բանալու բոլոր մասերը նշված են `PK`-ով։',
  '',
  '### Մյուս դիագրամները',
  '',
  ...images.filter(image => !image.name.startsWith('table-') && !['database-overview', 'system-architecture'].includes(image.name)).map(image => `- [${image.title}](${image.png}) · [SVG](${image.svg})`),
  '',
  '## Օգտագործում և խմբագրում',
  '',
  '- Կարելի է անմիջապես աշխատել `versions/` պանակի ամբողջական տարբերակներից մեկի հետ կամ խմբագրել առանձին բաժինները։',
  '- Word տեղափոխելիս օգտագործեք `images/` պանակի PNG ֆայլերը․ հայերեն գրությունները արդեն պատկերի մաս են։ SVG տարբերակները պահված են չափափոխման և հետագա խմբագրման համար։',
  '- Բազայի ընդհանուր քարտեզի համար օգտակար է առանձին լայնադիր էջը։ Մնացած նկարները կարելի է տեղադրել սովորական էջի լայնքով։',
  '- Էջերի վերջնական քանակը կախված է ընտրված տառաչափից, միջտողային հեռավորությունից և նկարների չափից։ Բաժինները գրված են բովանդակային ծավալով՝ մոտավոր 20–30 էջանոց աշխատանքների համար, առանց արհեստական հավասարեցման կամ պարտադիր էջաբաժանումների։',
  '- Կոդի հատվածները բացատրական օրինակներ կամ նշված կրճատված քաղվածքներ են։ Դրանք պարունակում են միայն անվտանգ օրինակային արժեքներ։',
  '',
  'Բաժինները խմբագրելուց հետո ամբողջական Markdown տարբերակները վերակազմելու համար՝ նախագծի արմատից.',
  '',
  '```bash',
  'node docs/project-documentation/tools/assemble.mjs',
  '```',
  '',
  'Դիագրամները վերագեներացնելու համար՝ նույն տեղից։ Գործիքն օգտագործում է նախագծում հասանելի `typescript` և `sharp` փաթեթները, կարդում է միայն կառուցվածքի աղբյուրները և չի միանում տվյալների բազային.',
  '',
  '```bash',
  'node docs/project-documentation/tools/generate-assets.mjs',
  '```',
  '',
  'Markdown հղումները, պատկերների ամբողջականությունը և բազայի ցանկերը ստուգելու համար՝',
  '',
  '```bash',
  'node docs/project-documentation/tools/validate.mjs',
  '```',
  '',
].join('\n')
await fs.writeFile(path.join(base, 'README.md'), readme)
console.log(JSON.stringify({ versions: statistics, diagrams: images.length }, null, 2))
