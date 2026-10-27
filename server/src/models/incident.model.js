import { DataTypes } from 'sequelize';

/** A safety or injury incident; `studentId` is empty when no single student is involved. */
export default (sequelize) => sequelize.define('Incident', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  incidentDate: { type: DataTypes.DATEONLY, allowNull: false },
  studentId: { type: DataTypes.INTEGER, allowNull: true },
  location: { type: DataTypes.STRING(120), allowNull: true },
  severity: { type: DataTypes.ENUM('minor', 'moderate', 'serious'), allowNull: false, defaultValue: 'minor' },
  description: { type: DataTypes.STRING(500), allowNull: false },
  actionTaken: { type: DataTypes.STRING(500), allowNull: true },
  status: { type: DataTypes.ENUM('open', 'resolved'), allowNull: false, defaultValue: 'open' },
}, { tableName: 'incidents' });
