import { DataTypes } from 'sequelize';

/** One row each time an existing attendance mark is changed: what it was, what it became, who and why. */
export default (sequelize) => sequelize.define('AttendanceCorrection', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  studentId: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  oldStatus: { type: DataTypes.STRING(10), allowNull: false },
  newStatus: { type: DataTypes.STRING(10), allowNull: false },
  reason: { type: DataTypes.STRING(255), allowNull: true },
  correctedBy: { type: DataTypes.INTEGER, allowNull: true },
  correctedByName: { type: DataTypes.STRING(100), allowNull: true },
}, { tableName: 'attendance_corrections', timestamps: true, createdAt: 'createdAt', updatedAt: false });
