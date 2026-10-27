import './config/env.js';
import { sequelize } from './models/index.js';
import { migrateDatabase } from './config/migration.js';

migrateDatabase()
  .then(async () => {
    await sequelize.close();
    console.log(`Database "${process.env.DB_NAME}" synced successfully.`);
  })
  .catch(async (error) => {
    console.error('Database sync failed:', error);
    await sequelize.close().catch(() => {});
    process.exit(1);
  });
