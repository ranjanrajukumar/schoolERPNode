import dotenv from 'dotenv';
import app from './app.js';
import { migrate } from './config/migrate.js';
import { sequelize } from './models/index.js';

dotenv.config();
const missing = ['DB_HOST', 'DB_USER', 'DB_NAME'].filter((k) => !process.env[k]);
if (missing.length) throw new Error(`Missing settings: ${missing.join(', ')} (see .env.example)`);

await migrate();

const port = Number(process.env.PORT || 4100);
const server = app.listen(port, () =>
  console.log(`Global registry running on port ${port}: http://localhost:${port}/api`),
);
server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') throw err;
  console.error(
    `Port ${port} is already in use: the registry is probably already running. To restart it, stop the old copy first.`,
  );
  process.exit(1);
});
const shutdown = () =>
  server.close(async () => {
    await sequelize.close();
    process.exit(0);
  });
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
