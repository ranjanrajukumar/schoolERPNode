// Starts the project with plain `node`, so it works in PowerShell even when npm.ps1 is blocked.
//   node dev.mjs              all three (registry, API, web app)
//   node dev.mjs client       only one: client | server | global
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import net from 'node:net';

const root = path.dirname(fileURLToPath(import.meta.url));

const services = {
  global: { dir: 'global', port: 4100, args: ['--watch-path=./src', 'src/index.js'] },
  server: { dir: 'server', port: 4000, args: ['--watch-path=./src', 'src/index.js'] },
  client: { dir: 'client', port: 5173, args: ['node_modules/vite/bin/vite.js'] },
};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(services);
const bad = names.filter((n) => !services[n]);
if (bad.length) {
  console.error(`Unknown: ${bad.join(', ')}. Use: ${Object.keys(services).join(', ')}`);
  process.exit(1);
}

const inUse = (port) => new Promise((resolve) => {
  const s = net.connect({ port, host: '127.0.0.1' });
  s.once('connect', () => { s.destroy(); resolve(true); });
  s.once('error', () => resolve(false));
});

const running = [];
for (const name of names) if (await inUse(services[name].port)) running.push(name);
running.forEach((n) => console.log(`[${n}] already running on port ${services[n].port}, skipped`));

const children = names.filter((n) => !running.includes(n)).map((name) => {
  const { dir, args } = services[name];
  const child = spawn(process.execPath, args, { cwd: path.join(root, dir), stdio: ['ignore', 'pipe', 'pipe'] });
  const tag = `[${name}] `;
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (d) => {
      buf += d;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      lines.forEach((l) => out.write(tag + l + '\n'));
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => console.log(`${tag}stopped (exit ${code})`));
  return child;
});

if (!children.length) {
  console.log('Everything is already running: open http://localhost:5173');
  process.exit(0);
}

const stop = () => {
  children.forEach((c) => c.kill());
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
