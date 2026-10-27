// Turns the app's registry (src/registry) into the default menu the server stores in the database:
// one row per home tile and per module page, with its label, icon, order and the roles that may see it.
//   npm run gen:menu             writes server/src/modules/appmenu/defaults.json
//   npm run gen:menu -- --check  fails when the file is out of date (run it after changing the registry)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const OUT = fileURLToPath(new URL('../../server/src/modules/appmenu/defaults.json', import.meta.url));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-menu-'));
fs.mkdirSync(path.join(TMP, 'registry'), { recursive: true });
// the registry imports the app's UI helpers (react-native); give it plain stand-ins, and add the .js endings plain Node needs
fs.writeFileSync(path.join(TMP, 'ui.js'), "export const niceDate = (k) => String(k ?? '');\nexport const money = (v) => String(v ?? '');\n");
const fix = (text) => text.replace(/from '\.\.\/ui'/g, "from '../ui.js'").replace(/from '\.\.\/icons'/g, "from '../icons.js'")
  .replace(/from '\.\/(format|extras|family|staff)'/g, "from './$1.js'");
for (const f of ['staff', 'family', 'format', 'extras', 'defaultMenu']) fs.writeFileSync(path.join(TMP, 'registry', `${f}.js`), fix(fs.readFileSync(path.join(SRC, 'registry', `${f}.js`), 'utf8')));
fs.writeFileSync(path.join(TMP, 'icons.js'), fs.readFileSync(path.join(SRC, 'icons.js'), 'utf8'));
const { buildDefaultMenu } = await import(pathToFileURL(path.join(TMP, 'registry', 'defaultMenu.js')).href);
const items = buildDefaultMenu();
fs.rmSync(TMP, { recursive: true, force: true });

const text = `${JSON.stringify(items, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== text) { console.error('server/src/modules/appmenu/defaults.json is out of date: run npm run gen:menu in app/'); process.exit(1); }
  console.log(`menu defaults are up to date (${items.length} items)`);
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${items.length} menu items to ${path.relative(process.cwd(), OUT)}`);
}
