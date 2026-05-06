import {createClient} from '@sanity/client'
import {parse} from 'csv-parse/sync'
import {readFileSync, existsSync, createReadStream} from 'node:fs'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {randomUUID} from 'node:crypto'
import {lookup as lookupMime} from 'mime-types'
import {config as loadEnv} from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadEnv({path: join(__dirname, '..', '.env')})

const PROJECT_ID = 'ldpz4q29'
const DATASET = 'production'
const API_VERSION = '2025-02-19'
const TOKEN = process.env.SANITY_WRITE_TOKEN

if (!TOKEN) {
  console.error('✗ SANITY_WRITE_TOKEN not found in apps/studio/.env')
  process.exit(1)
}

const CSV_PATH = join(__dirname, 'projects.csv')
const COVERS_DIR = join(__dirname, 'covers')

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  token: TOKEN,
  useCdn: false,
})

type Row = {
  slug: string
  client: string
  category: string
  site_url: string
  excerpt_es: string
  excerpt_en: string
  description_es: string
  description_en: string
}

function loadRows(): Row[] {
  const csv = readFileSync(CSV_PATH, 'utf8')
  return parse(csv, {columns: true, skip_empty_lines: true, trim: true})
}

function paragraphsToPortableText(text: string) {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  return paragraphs.map((para) => ({
    _type: 'block',
    _key: randomUUID().slice(0, 12),
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: randomUUID().slice(0, 12),
        text: para,
        marks: [],
      },
    ],
  }))
}

async function uploadCoverIfNeeded(slug: string, existingAssetRef: string | null) {
  if (existingAssetRef) {
    return existingAssetRef
  }
  const filePath = join(COVERS_DIR, `${slug}.jpg`)
  if (!existsSync(filePath)) {
    console.log(`   ⚠️  no cover at ${filePath}`)
    return null
  }
  const mime = lookupMime(filePath) || 'image/jpeg'
  const asset = await client.assets.upload('image', createReadStream(filePath), {
    filename: `${slug}.jpg`,
    contentType: mime,
  })
  console.log(`   ↑ uploaded cover (asset ${asset._id})`)
  return asset._id
}

async function fetchExistingCoverRef(docId: string): Promise<string | null> {
  const existing = await client.fetch<{cover?: {asset?: {_ref?: string}}} | null>(
    `*[_id == $id][0]{cover{asset}}`,
    {id: docId},
  )
  return existing?.cover?.asset?._ref ?? null
}

async function importRow(row: Row) {
  console.log(`\n📦 ${row.slug} — ${row.client}`)

  const esId = `project-${row.slug}-es`
  const enId = `project-${row.slug}-en`
  const metaId = `translation-${row.slug}`

  // Reuse existing cover asset if already uploaded (across either translation)
  const existingEsCover = await fetchExistingCoverRef(esId)
  const existingEnCover = await fetchExistingCoverRef(enId)
  const existingAssetRef = existingEsCover ?? existingEnCover
  const assetRef = await uploadCoverIfNeeded(row.slug, existingAssetRef)

  const cover = assetRef
    ? {
        _type: 'image',
        asset: {_type: 'reference', _ref: assetRef},
        alt: row.client,
      }
    : undefined

  const links = row.site_url
    ? {siteUrl: row.site_url}
    : undefined

  const publishedAt = new Date().toISOString()

  const esDoc = {
    _id: esId,
    _type: 'project',
    language: 'es',
    title: row.client,
    slug: {_type: 'slug', current: row.slug},
    publishedAt,
    excerpt: row.excerpt_es,
    body: paragraphsToPortableText(row.description_es),
    ...(cover ? {cover} : {}),
    ...(links ? {links} : {}),
  }

  const enDoc = {
    _id: enId,
    _type: 'project',
    language: 'en',
    title: row.client,
    slug: {_type: 'slug', current: row.slug},
    publishedAt,
    excerpt: row.excerpt_en,
    body: paragraphsToPortableText(row.description_en),
    ...(cover ? {cover} : {}),
    ...(links ? {links} : {}),
  }

  const metaDoc = {
    _id: metaId,
    _type: 'translation.metadata',
    schemaTypes: ['project'],
    translations: [
      {
        _key: 'es',
        _type: 'internationalizedArrayReferenceValue',
        value: {_type: 'reference', _ref: esId, _weak: true},
      },
      {
        _key: 'en',
        _type: 'internationalizedArrayReferenceValue',
        value: {_type: 'reference', _ref: enId, _weak: true},
      },
    ],
  }

  await client
    .transaction()
    .createOrReplace(esDoc)
    .createOrReplace(enDoc)
    .createOrReplace(metaDoc)
    .commit()

  console.log(`   ✓ committed ES + EN + metadata`)
}

async function main() {
  const rows = loadRows()
  console.log(`Loaded ${rows.length} rows from ${CSV_PATH}`)
  console.log(`Target: ${PROJECT_ID}/${DATASET}\n`)

  for (const row of rows) {
    try {
      await importRow(row)
    } catch (err) {
      console.error(`✗ failed ${row.slug}: ${(err as Error).message}`)
    }
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
