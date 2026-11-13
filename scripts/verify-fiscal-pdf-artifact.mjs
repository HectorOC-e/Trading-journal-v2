import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const manifestPath = resolve('.next/server/app/api/tax/export/route.js.nft.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const binPath = resolve('node_modules/@sparticuz/chromium/bin');
const packs = readdirSync(binPath).filter(name => name.endsWith('.br'));
if (!packs.includes('chromium.br')) throw new Error('Chromium binary pack is missing');
const traced = new Set(manifest.files.filter(file => file.endsWith('.br')).map(file => realpathSync(resolve(dirname(manifestPath), file))));
for (const pack of packs) {
  const source = realpathSync(join(binPath, pack));
  if (!traced.has(source) || statSync(source).size === 0)
    throw new Error(`Fiscal PDF artifact does not include ${basename(pack)}`);
}
console.log(`Fiscal PDF artifact includes ${packs.length} Chromium packs.`);
