import { assertEnvironment, env } from './config/env.js';
import app from './app.js';
import { sequelize } from './models/index.js';
import { migrateDatabase } from './config/migration.js';
import { startAbsenceAlertTimer } from './modules/attendance/autoAbsence.service.js';
import { startAutoBackupTimer } from './modules/settings/autoBackup.service.js';
import { startGlobalSync } from './modules/globalauth/globalAuth.service.js';

assertEnvironment();

await migrateDatabase();

const server = app.listen(env.port(), () => console.log('API on port', env.port()));
startAbsenceAlertTimer();
startAutoBackupTimer();
startGlobalSync();

const shutdown = () => server.close(async () => {
  await sequelize.close();
  process.exit(0);
});
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
