import { Sequelize } from 'sequelize';
import { dbSsl } from './dbSsl.js';
import './env.js'; // loads .env into process.env; importing it (not calling dotenv here too) means whoever reaches this file always gets it, however they got here

export const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
  dialectOptions: dbSsl(),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: { max: 10, min: 0, idle: 10_000, acquire: 30_000 },
  define: { underscored: true, timestamps: false },
});
