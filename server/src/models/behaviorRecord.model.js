import { DataTypes } from 'sequelize';

export const BEHAVIOR_TYPES = ['merit', 'demerit', 'incident', 'note'];

export default (sequelize) => sequelize.define('BehaviorRecord', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  type: { type: DataTypes.ENUM(...BEHAVIOR_TYPES), allowNull: false },
  title: { type: DataTypes.STRING(120), allowNull: false },
  description: { type: DataTypes.STRING(500), allowNull: true },
  points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  recordedBy: { type: DataTypes.INTEGER, allowNull: true },
  recordedByName: { type: DataTypes.STRING(100), allowNull: true },
}, { tableName: 'behavior_records', timestamps: true, createdAt: 'createdAt', updatedAt: false });
