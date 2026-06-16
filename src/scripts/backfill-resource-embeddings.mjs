// Backfill notes_embedding for a user's learning_resources that have notes but
// no vector (SP2). Standalone twin of the learning-resources embed-on-write hook —
// reuses the same AES-256-GCM key format and the user's persisted AI key.
//
//   node scripts/backfill-resource-embeddings.mjs <email>
import 'dotenv/config'
import pg from 'pg'
import { createDecipheriv, createHash } from 'crypto'

const email = process.argv[2]
if (!email) { console.error('usage: node scripts/backfill-resource-embeddings.mjs <email>'); process.exit(1) }

// Mirror of lib/ai/key-encryption.ts (aes-256-gcm, "iv:tag:ciphertext" hex)
function encKey() {
  const s = process.env.AI_KEY_ENCRYPTION_SECRET
  if (s && /^[0-9a-fA-F]{64}$/.test(s)) return Buffer.from(s, 'hex')
  return createHash('sha256').update('tj-dev-insecure-ai-key-encryption-seed').digest()
}
function decryptApiKey(enc) {
  const [iv, tag, ct] = enc.split(':')
  const d = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(iv, 'hex'))
  d.setAuthTag(Buffer.from(tag, 'hex'))
  return Buffer.concat([d.update(Buffer.from(ct, 'hex')), d.final()]).toString('utf8')
}

const EMBED_MODEL = { openrouter: 'openai/text-embedding-3-small', openai: 'text-embedding-3-small' }

async function embedText(text, model, apiKey) {
  const viaOR = model.includes('/')
  const base = viaOR ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1'
  const res = await fetch(`${base}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: text }),
  })
  if (!res.ok) { console.error('  embed HTTP', res.status, (await res.text()).slice(0, 200)); return null }
  const j = await res.json()
  return j.data?.[0]?.embedding ?? null
}

const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()
const u = await c.query('select id from users where email=$1', [email])
if (!u.rows[0]) { console.error('user not found:', email); process.exit(1) }
const uid = u.rows[0].id

const cfg = await c.query('select provider, api_key_enc, model from user_ai_configs where user_id=$1 and is_active=true limit 1', [uid])
if (!cfg.rows[0]) { console.error('no active AI config for', email); process.exit(1) }
const provider = cfg.rows[0].provider
const apiKey = decryptApiKey(cfg.rows[0].api_key_enc)
const model = cfg.rows[0].model || EMBED_MODEL[provider] || EMBED_MODEL.openai
console.log(`provider=${provider} model=${model} key=${apiKey.slice(0,6)}…`)

const pending = await c.query(
  "select id, notes from learning_resources where user_id=$1 and notes<>'' and notes_embedding is null order by updated_at desc",
  [uid],
)
console.log(`pending resource notes to embed: ${pending.rowCount}`)
let ok = 0, fail = 0
for (const r of pending.rows) {
  const v = await embedText(r.notes, model, apiKey)
  if (!v) { fail++; continue }
  await c.query(`update learning_resources set notes_embedding = $1::vector where id = $2::uuid`, [`[${v.join(',')}]`, r.id])
  ok++
  if (ok % 20 === 0) console.log(`  …${ok} embedded`)
}
const rem = await c.query("select count(*)::int n from learning_resources where user_id=$1 and notes<>'' and notes_embedding is null", [uid])
console.log(`done: embedded=${ok} failed=${fail} remaining=${rem.rows[0].n}`)
await c.end()
