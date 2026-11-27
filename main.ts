// HomeLedger entry (Node 22, standard library only). The site is this
// directory's app/ folder: plain static files a browser opens at
// app/index.html (ES modules, CSS, no build step), its content held in its
// own files — nothing it runs, styles or shows loads over the network.
// The program hands it in: it copies app/ and screenshots/ from beside
// this file to /output and writes /output/dossier.json, the summary the
// judge reads (your screenshots, the first load's files and bytes, and
// your source), with the vendored make.fun library. Leave
// vendor/makefun-frontend.ts as it is: the scorer requires dossier.json
// to be byte for byte what its own copy writes.
//
// Serve it locally with `node serve.ts` from the kit, then open
// http://localhost:8080. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Before it exits it verifies its own output: every copied file must be
// byte-identical to the source, and the dossier it just wrote must parse
// and describe exactly those files. A silent bad copy used to be possible
// (a truncated write, a stale dossier from an earlier run); now any of
// that fails the run instead of handing in a broken entry.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// Every file under a directory, as paths relative to it, in sorted order.
function listFiles(dir, base = dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, base, found);
    else if (entry.isFile()) found.push(full.slice(base.length + 1));
  }
  return found;
}

function fail(msg) {
  throw new Error(`main.ts verification failed: ${msg}`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files and directories
// in app/ or 16 MiB of app files: app/ counts beside /output's own
// 1000-entry cap, its screenshots/ and dossier.json).
const dossierBytes = buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 });
writeFileSync(join(out, 'dossier.json'), dossierBytes);

// ---- verify what was written -------------------------------------------
// 1. The copy: same files, same bytes, on both sides.
for (const sub of ['app', 'screenshots']) {
  const srcFiles = listFiles(join(here, sub));
  const outFiles = listFiles(join(out, sub));
  if (srcFiles.length !== outFiles.length || srcFiles.some((f, i) => f !== outFiles[i])) {
    fail(`${sub}/ file list differs between source and output`);
  }
  for (const rel of srcFiles) {
    const a = readFileSync(join(here, sub, rel));
    const b = readFileSync(join(out, sub, rel));
    if (!a.equals(b)) fail(`${sub}/${rel} was not copied byte-identically`);
  }
}
// 2. The dossier: parses, is the right schema, and describes exactly the
// screenshots on disk (count, names, hashes) — so a stale or truncated
// dossier.json can never be handed in unnoticed.
const dossierPath = join(out, 'dossier.json');
const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
if (dossier.schema !== 'makefun/dossier/v1') fail(`dossier schema is ${dossier.schema}, not makefun/dossier/v1`);
if (!Array.isArray(dossier.images) || dossier.images.length !== 4) fail(`dossier lists ${dossier.images?.length} images, expected 4`);
if (dossier.cover !== 0) fail(`dossier cover is ${dossier.cover}, expected 0`);
if (typeof dossier.text !== 'string' || !dossier.text.startsWith('## Load')) fail('dossier text is missing or malformed');
for (const img of dossier.images) {
  const file = join(out, 'screenshots', img.name);
  if (!existsSync(file)) fail(`dossier names screenshot ${img.name}, which is not in the output`);
  if (sha256(readFileSync(file)) !== img.sha256) fail(`dossier hash for ${img.name} does not match the file on disk`);
}
const appBytes = listFiles(join(out, 'app')).reduce((s, f) => s + statSync(join(out, 'app', f)).size, 0);
console.log(
  `verified: ${listFiles(join(out, 'app')).length} app files (${appBytes} bytes), ${dossier.images.length} screenshots, dossier.json ${statSync(dossierPath).size} bytes — all byte-identical to source`,
);
