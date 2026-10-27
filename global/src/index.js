import dotenv from 'dotenv';
import app from './app.js';
import { migrate } from './config/migrate.js';
import { sequelize } from './models/index.js';

dotenv.config();
const missing = ['DB_HOST', 'DB_USER', 'DB_NAME'].filter((k) => !process.env[k]);
if (missing.length) throw new Error(`Missing settings: ${missing.join(', ')} (see .env.example)`);

await migrate();

const port = Number(process.env.PORT || 4100);
const server = app.listen(port, () => console.log('Global registry on port', port));
const shutdown = () => server.close(async () => { await sequelize.close(); process.exit(0); });
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
