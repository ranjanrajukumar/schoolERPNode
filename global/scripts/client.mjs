// Manage the schools in the global registry from the command line (no admin key needed: it talks to the database directly).
//   npm run client -- list
//   npm run client -- add --code greenfield --name "Greenfield School" --api https://erp.greenfield.edu/api [--city Pune --state MH --logo https://... --notes "..." --skip-check]
//   npm run client -- update greenfield [--name ... --api ... --city ... --active false]
//   npm run client -- key greenfield        a new key for the school's server (the old one stops working)
//   npm run client -- remove greenfield
import { migrate } from '../src/config/migrate.js';
import { sequelize } from '../src/models/index.js';
import { create, listAll, remove, rotateKey, update } from '../src/services/clients.service.js';

const [, , command, ...rest] = process.argv;
const FLAGS = ['--skip-check'];
const positional = rest.filter((a, i) => !a.startsWith('--') && (i === 0 || !rest[i - 1].startsWith('--') || FLAGS.includes(rest[i - 1])));
const opt = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const body = () => compact({
  code: opt('code'), name: opt('name'), city: opt('city'), state: opt('state'), logoUrl: opt('logo'), apiUrl: opt('api'), notes: opt('notes'),
  active: opt('active') === undefined ? undefined : opt('active') === 'true',
});

try {
  await migrate();
  if (command === 'list') {
    console.table((await listAll()).map((r) => ({ code: r.code, name: r.name, city: r.city, active: r.active, api: r.apiUrl })));
  } else if (command === 'add') {
    const c = await create(body(), { verify: !rest.includes('--skip-check') });
    console.log(`Added ${c.name} (${c.code}) -> ${c.apiUrl}`);
    console.log(`Key for the school's server (shown once): ${c.apiKey}`);
    console.log(`  GLOBAL_CLIENT_CODE=${c.code}
  GLOBAL_CLIENT_KEY=${c.apiKey}`);
  } else if (command === 'update') {
    const c = await update(positional[0], body(), { verify: !rest.includes('--skip-check') });
    console.log(`Updated ${c.name} (${c.code}): ${c.active ? 'active' : 'inactive'}, ${c.apiUrl}`);
  } else if (command === 'key') {
    const k = await rotateKey(positional[0]);
    console.log(`New key for ${k.code} (shown once): ${k.apiKey}`);
  } else if (command === 'remove') {
    await remove(positional[0]);
    console.log(`Removed ${positional[0]}`);
  } else {
    console.log('Commands: list | add --code --name --api | update <code> | key <code> | remove <code>');
  }
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
