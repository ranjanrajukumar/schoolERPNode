import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 10, min: 0, idle: 10_000, acquire: 30_000 },
    define: { underscored: true, timestamps: false },
  },
);
