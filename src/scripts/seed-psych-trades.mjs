// One-off seed: ~85 CLOSED trades WITH psychology + Spanish notes for the test
// user ariaoc89@gmail.com. Does NOT delete existing data. Notes feed the
// embeddings backfill so semantic search has real content to index.
//
//   node scripts/seed-psych-trades.mjs           # insert
//   node scripts/seed-psych-trades.mjs --dry      # print plan, no write
//   node scripts/seed-psych-trades.mjs --undo     # remove only rows tagged seed:psych
import 'dotenv/config'
import pg from 'pg'

const UID = '5c69e364-3819-4df7-abf0-f484794250ed' // ariaoc89@gmail.com
const SEED_TAG = 'seed:psych'                       // marker tag for clean undo
const N = 85

// Accounts (healthy/usable only — skip blocked + zero-balance)
const ACCOUNTS = [
  { id: '183ea7e3-f636-47a6-9314-273ee19e19eb', w: 40 }, // FTMO 100K — Phase 1
  { id: '2ba374d4-bcef-4f4b-82bf-07e806811d35', w: 35 }, // Cuenta Sana
  { id: '4067fb1d-4c52-4074-ad9e-9c17df42aef7', w: 25 }, // Cuenta EUR
]
const SETUP = {
  OBR: 'e04cec58-50f6-4f82-94cf-6bdb8b87dd30', // NQ Futures
  BL:  '5b847ef1-6604-4199-9ffa-212b1bfd6f63', // Forex
  RN:  'b16241ba-d808-47bc-a0aa-7c71b8306238', // Indices
}
const SYMS = [
  { sym: 'EURUSD', base: 1.0850, dist: [0.0025, 0.0060], setup: 'BL',  sess: ['London','New York'], oh:[3,9],  dec: 5 },
  { sym: 'GBPUSD', base: 1.2700, dist: [0.0030, 0.0070], setup: 'BL',  sess: ['London','New York'], oh:[3,9],  dec: 5 },
  { sym: 'XAUUSD', base: 2350,   dist: [4, 12],          setup: 'BL',  sess: ['London','New York'], oh:[3,10], dec: 2 },
  { sym: 'NAS100', base: 18500,  dist: [30, 90],         setup: 'OBR', sess: ['New York'],          oh:[9,11], dec: 2 },
  { sym: 'NQ',     base: 18480,  dist: [30, 90],         setup: 'OBR', sess: ['New York'],          oh:[9,11], dec: 2 },
  { sym: 'US30',   base: 39000,  dist: [60, 180],        setup: 'RN',  sess: ['New York'],          oh:[9,11], dec: 2 },
  { sym: 'US500',  base: 5300,   dist: [8, 22],          setup: 'RN',  sess: ['New York'],          oh:[9,11], dec: 2 },
]

// deterministic RNG (mulberry32) so reruns/undo are stable
let s = 0x9e3779b9
const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const pick = (a) => a[Math.floor(rnd() * a.length)]
const between = (lo, hi) => lo + rnd() * (hi - lo)
const wpick = (arr) => { const tot = arr.reduce((a, b) => a + b.w, 0); let r = rnd() * tot; for (const x of arr) { if ((r -= x.w) <= 0) return x } return arr[arr.length - 1] }

// weekday date string between 2026-02-03 and 2026-06-09
function randWeekday() {
  const start = Date.UTC(2026, 1, 3), end = Date.UTC(2026, 5, 9)
  let d
  do { d = new Date(start + rnd() * (end - start)) } while (d.getUTCDay() === 0 || d.getUTCDay() === 6)
  return d.toISOString().slice(0, 10)
}
const hhmm = (h, m) => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`

// psychology profiles correlated to outcome — tells a coachable story
const EMO_WIN  = ['calm','calm','excited','confident','calm']
const EMO_LOSS = ['anxious','fearful','overconfident','anxious','revenge']
const NOTE_WIN = [
  'Respeté el plan, esperé la confirmación en killzone y dejé correr hasta target. Ejecución limpia.',
  'Entrada en pullback al order block, stop bajo el mínimo. Salí en parcial y moví a BE.',
  'Confluencia HTF alcista clara, gestioné sin mover el stop. Disciplina alta.',
  'Setup A+ del día, sin noticias cerca. Tomé el riesgo planeado y funcionó.',
  'Paciencia: esperé el retest del rango antes de entrar. Mejor trade de la semana.',
]
const NOTE_LOSS = [
  'Entré antes de la confirmación por FOMO, el precio barrió mi stop de inmediato.',
  'Revenge trade tras la pérdida anterior, doblé riesgo sin setup válido. Error claro.',
  'Stop demasiado ajustado, me sacó el ruido y luego fue a target sin mí.',
  'Operé contra la tendencia HTF, mala lectura del contexto. No respeté la checklist.',
  'Moví el stop esperando que regresara, perdí más de 1R. Indisciplina.',
]
const NOTE_BE = [
  'Cerré en breakeven al ver divergencia, decisión correcta aunque sin ganancia.',
  'El precio no llegó a target, salí manual antes de NFP para no exponerme.',
]

function buildTrade(i) {
  const acc = wpick(ACCOUNTS)
  const m = pick(SYMS)
  const dir = rnd() < 0.5 ? 'LONG' : 'SHORT'
  const sgn = dir === 'LONG' ? 1 : -1
  const stopDist = between(m.dist[0], m.dist[1])
  const rr = between(1.5, 3.0)
  const entry = m.base * (1 + between(-0.004, 0.004))
  const stop = entry - sgn * stopDist
  const target = entry + sgn * stopDist * rr

  // outcome distribution: ~50% win, ~42% loss, ~8% breakeven
  const roll = rnd()
  let outcome, rMult, emo, fomo = false, revenge = false, exq, conf, notes
  if (roll < 0.50) {
    outcome = 'win'; rMult = between(0.8, Math.min(rr, 3.1))
    emo = pick(EMO_WIN); exq = Math.round(between(4, 5)); conf = Math.round(between(3, 5)); notes = pick(NOTE_WIN)
  } else if (roll < 0.92) {
    outcome = 'loss'
    const bad = rnd() < 0.28 // a chunk are emotional blow-ups
    rMult = bad ? between(-2.1, -1.2) : between(-1.05, -0.4)
    emo = pick(EMO_LOSS); exq = Math.round(between(1, bad ? 2 : 3)); conf = Math.round(between(2, 4)); notes = pick(NOTE_LOSS)
    fomo = bad ? rnd() < 0.6 : rnd() < 0.2
    revenge = bad ? rnd() < 0.55 : rnd() < 0.1
  } else {
    outcome = 'be'; rMult = between(-0.1, 0.1)
    emo = pick(['calm','anxious']); exq = 3; conf = 3; notes = pick(NOTE_BE)
  }

  const closePrice = entry + sgn * stopDist * rMult
  const riskDollars = between(150, 900)
  const pnl = +(rMult * riskDollars).toFixed(2)
  const size = +between(0.3, 3).toFixed(2)
  const sess = pick(m.sess)
  const oh = Math.floor(between(m.oh[0], m.oh[1]))
  const om = Math.floor(between(0, 59))
  const ch = Math.min(22, oh + Math.floor(between(0, 4)))
  const cm = Math.floor(between(0, 59))

  const tags = [SEED_TAG]
  if (outcome === 'win' && rMult >= 2) tags.push('A+')
  if (fomo) tags.push('fomo')
  if (revenge) tags.push('revenge')
  if (rnd() < 0.25) tags.push('news')

  return {
    user_id: UID, account_id: acc.id, setup_id: SETUP[m.setup],
    direction: dir, symbol: m.sym,
    entry: entry.toFixed(m.dec), stop: stop.toFixed(m.dec), target: target.toFixed(m.dec),
    size, date: randWeekday(), open_time: hhmm(oh, om), session: sess,
    tags, notes, screenshot_urls: [], r_multiple: +rMult.toFixed(3), pnl,
    status: 'CLOSED', close_price: closePrice.toFixed(m.dec), close_time: hhmm(ch, cm),
    commission: +between(0.5, 7).toFixed(2),
    emotion_before: emo, confidence_rating: conf, execution_quality: exq,
    fomo_flag: fomo, revenge_flag: revenge,
    plan_notes: outcome === 'win' ? 'Seguí el plan definido.' : outcome === 'loss' ? 'Desvío del plan.' : 'Salida discrecional.',
  }
}

const DRY = process.argv.includes('--dry')
const UNDO = process.argv.includes('--undo')
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()

if (UNDO) {
  const r = await c.query(`DELETE FROM trades WHERE user_id=$1 AND $2 = ANY(tags)`, [UID, SEED_TAG])
  console.log(`Deleted ${r.rowCount} seeded trades (tag ${SEED_TAG}).`)
  await c.end(); process.exit(0)
}

const rows = Array.from({ length: N }, (_, i) => buildTrade(i))
const wins = rows.filter(r => r.pnl > 0).length
const net = rows.reduce((a, r) => a + r.pnl, 0)
console.log(`Built ${rows.length} trades | wins=${wins} (${(wins/rows.length*100).toFixed(0)}%) | net=$${net.toFixed(0)} | fomo=${rows.filter(r=>r.fomo_flag).length} | revenge=${rows.filter(r=>r.revenge_flag).length}`)
console.log('sample:', JSON.stringify(rows[0]))

if (DRY) { console.log('--dry: nothing written.'); await c.end(); process.exit(0) }

const cols = ['user_id','account_id','setup_id','direction','symbol','entry','stop','target','size','date','open_time','session','tags','notes','screenshot_urls','r_multiple','pnl','status','close_price','close_time','commission','emotion_before','confidence_rating','execution_quality','fomo_flag','revenge_flag','plan_notes']
await c.query('BEGIN')
let n = 0
for (const r of rows) {
  const vals = cols.map(k => r[k])
  const ph = cols.map((_, i) => `$${i + 1}`).join(',')
  await c.query(`INSERT INTO trades (${cols.join(',')}) VALUES (${ph})`, vals)
  n++
}
await c.query('COMMIT')
console.log(`Inserted ${n} trades for ariaoc89@gmail.com.`)
await c.end()
