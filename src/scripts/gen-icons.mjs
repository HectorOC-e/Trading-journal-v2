// Dependency-free PWA icon generator.
// Rasterizes the app mark (rounded blue tile + white equity polyline + green dot)
// into PNGs using only Node built-ins (zlib). Run: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib"
import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, "../public/icons")
mkdirSync(OUT_DIR, { recursive: true })

// Palette
const BG = [0x4f, 0x6e, 0xf7]   // accent blue
const WHITE = [0xff, 0xff, 0xff]
const GREEN = [0x22, 0xc5, 0x5e]

// Normalized geometry on a 512 grid (scaled per size)
const POLY = [
  [80, 350], [180, 250], [260, 300], [350, 160], [440, 200],
]
const DOT = [440, 200]

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v }

// distance from point P to segment AB
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy || 1
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = clamp(t, 0, 1)
  const cx = ax + t * dx, cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

// rounded-rect signed coverage (inside = small dist)
function inRoundRect(x, y, w, h, r) {
  const rx = clamp(x, r, w - r)
  const ry = clamp(y, r, h - r)
  const dx = x - rx, dy = y - ry
  // corner region
  if ((x < r || x > w - r) && (y < r || y > h - r)) {
    return Math.hypot(dx, dy) <= r
  }
  return x >= 0 && x <= w && y >= 0 && y <= h
}

function render(size) {
  const SS = 4 // supersample factor for anti-aliasing
  const S = size * SS
  const scale = S / 512
  const buf = new Uint8Array(S * S * 4)

  const radius = 80 * scale
  const strokeW = 32 * scale
  const dotR = 20 * scale

  const poly = POLY.map(([x, y]) => [x * scale, y * scale])
  const dot = [DOT[0] * scale, DOT[1] * scale]

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4
      const px = x + 0.5, py = y + 0.5

      // outside rounded tile → transparent
      if (!inRoundRect(px, py, S, S, radius)) {
        buf[i + 3] = 0
        continue
      }
      // base = blue
      let r = BG[0], g = BG[1], b = BG[2]

      // polyline (white) — min distance to any segment
      let dLine = Infinity
      for (let k = 0; k < poly.length - 1; k++) {
        dLine = Math.min(dLine, distSeg(px, py, poly[k][0], poly[k][1], poly[k + 1][0], poly[k + 1][1]))
      }
      if (dLine <= strokeW / 2) { r = WHITE[0]; g = WHITE[1]; b = WHITE[2] }

      // green end dot (drawn on top)
      if (Math.hypot(px - dot[0], py - dot[1]) <= dotR) { r = GREEN[0]; g = GREEN[1]; b = GREEN[2] }

      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255
    }
  }

  // downsample SS→1 (box filter) for anti-aliasing
  const out = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const si = ((y * SS + sy) * S + (x * SS + sx)) * 4
          r += buf[si]; g += buf[si + 1]; b += buf[si + 2]; a += buf[si + 3]
        }
      }
      const n = SS * SS
      const oi = (y * size + x) * 4
      out[oi] = Math.round(r / n)
      out[oi + 1] = Math.round(g / n)
      out[oi + 2] = Math.round(b / n)
      out[oi + 3] = Math.round(a / n)
    }
  }
  return out
}

// ── PNG encoding (RGBA, filter 0 per scanline) ──
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1))
  }
  return ~c >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, "ascii")
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}
function encodePNG(rgba, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  // raw with per-row filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.subarray(y * size * 4, (y + 1) * size * 4)
      .forEach((v, idx) => { raw[y * (size * 4 + 1) + 1 + idx] = v })
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))])
}

for (const size of [192, 512]) {
  const rgba = render(size)
  const png = encodePNG(rgba, size)
  const path = resolve(OUT_DIR, `icon-${size}.png`)
  writeFileSync(path, png)
  console.log(`wrote ${path} (${png.length} bytes)`)
}
