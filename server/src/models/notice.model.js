import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('Notice', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING(160), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  audience: { type: DataTypes.ENUM('all', 'teachers', 'parents', 'students'), allowNull: false, defaultValue: 'all' },
}, { tableName: 'notices', timestamps: true, createdAt: 'createdAt', updatedAt: false });
