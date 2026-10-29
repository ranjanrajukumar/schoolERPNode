// Turns the website's built-in menu (src/config/menu.js) into the default rows the server stores in the database (audience "web"):
// one row per group and per page, with its label, icon, order and the roles that may see it.
//   npm run gen:menu             writes server/src/modules/appmenu/webDefaults.json
//   npm run gen:menu -- --check  fails when the file is out of date (run it after changing menu.js)
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OUT = fileURLToPath(new URL('../../server/src/modules/appmenu/webDefaults.json', import.meta.url));
const { MENU } = await import(pathToFileURL(fileURLToPath(new URL('../src/config/menu.js', import.meta.url))).href);

const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const items = [];
MENU.forEach((g, gi) => {
  items.push({ audience: 'web', key: g.key, parentKey: null, kind: 'module', label: g.label, icon: g.icon, roles: g.roles, position: (gi + 1) * 10 });
  g.items.forEach((i, ii) =>
    items.push({
      audience: 'web', key: i.key, parentKey: g.key, kind: i.built ? 'page' : 'planned', label: i.label, icon: g.icon,
      roles: same(i.roles, g.roles) ? null : i.roles, position: (ii + 1) * 10,
    }),
  );
});

const text = `${JSON.stringify(items, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
  if (current !== text) {
    console.error(`${OUT} is out of date: run npm run gen:menu in client/`);
    process.exit(1);
  }
  console.log(`web menu defaults are up to date (${items.length} items)`);
} else {
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${items.length} web menu items to ${OUT}`);
}
