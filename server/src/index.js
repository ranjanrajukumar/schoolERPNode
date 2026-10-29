import { assertEnvironment, env } from './config/env.js';
import app from './app.js';
import { sequelize } from './models/index.js';
import { migrateDatabase } from './config/migration.js';
import { startAbsenceAlertTimer } from './modules/attendance/autoAbsence.service.js';
import { startAutoBackupTimer } from './modules/settings/autoBackup.service.js';
import { startGlobalSync } from './modules/globalauth/globalAuth.service.js';

assertEnvironment();

await migrateDatabase();

const server = app.listen(env.port(), () =>
  console.log(`API running on port ${env.port()}: http://localhost:${env.port()}/api`),
);
server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') throw err;
  console.error(
    `Port ${env.port()} is already in use: the API is probably already running (open http://localhost:5173). To restart it, stop the old copy first.`,
  );
  process.exit(1);
});
startAbsenceAlertTimer();
startAutoBackupTimer();
startGlobalSync();

const shutdown = () =>
  server.close(async () => {
    await sequelize.close();
    process.exit(0);
  });
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
