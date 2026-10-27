import { DataTypes } from 'sequelize';

export default (sequelize) => sequelize.define('SafetyInspection', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  inspectionDate: { type: DataTypes.DATEONLY, allowNull: false },
  area: { type: DataTypes.STRING(120), allowNull: false },
  inspector: { type: DataTypes.STRING(100), allowNull: true },
  result: { type: DataTypes.ENUM('pass', 'needs_action', 'fail'), allowNull: false, defaultValue: 'pass' },
  notes: { type: DataTypes.STRING(500), allowNull: true },
  nextDue: { type: DataTypes.DATEONLY, allowNull: true },
}, { tableName: 'safety_inspections' });
